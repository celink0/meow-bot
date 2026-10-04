"""Meow bot on Fetch.ai: lets people make and battle cats from ASI:One.

It forwards every chat message to the meow bot (src/bot.js must be running) and sends the
replies back, with cat cards uploaded to Agentverse storage so they show up as images.
Run: python agent.py
"""

import base64
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

import httpx
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    Resource,
    ResourceContent,
    TextContent,
    chat_protocol_spec,
)
from uagents_core.storage import ExternalStorage


def _load_env():
    env = Path(__file__).resolve().parent.parent / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())


_load_env()

BOT_URL = os.environ.get("MEOW_BOT_URL", "http://127.0.0.1:8787")
AGENTVERSE_API_KEY = os.environ.get("AGENTVERSE_API_KEY", "")
STORAGE_URL = "https://agentverse.ai/v1/storage"

agent = Agent(
    name="meow-bot",
    seed=os.environ.get("FETCH_AGENT_SEED", "meow-bot-agent-change-me"),
    port=int(os.environ.get("FETCH_AGENT_PORT", "8001")),
    mailbox=os.environ.get("FETCH_MAILBOX", "1") == "1",
    description="Meow at me and I make you a pixel cat. Then battle your friends' cats, on ASI:One or iMessage.",
)
storage = ExternalStorage(api_token=AGENTVERSE_API_KEY, storage_url=STORAGE_URL) if AGENTVERSE_API_KEY else None
chat = Protocol(spec=chat_protocol_spec)


def _to_content(parts: list[dict], receiver: str) -> list:
    content = []
    for part in parts:
        if part["type"] == "text":
            content.append(TextContent(type="text", text=part["text"]))
        elif storage:
            asset_id = storage.create_asset(name=part["name"], content=base64.b64decode(part["png_b64"]), mime_type="image/png")
            storage.set_permissions(asset_id=asset_id, agent_address=receiver)
            content.append(
                ResourceContent(
                    type="resource",
                    resource_id=asset_id,
                    resource=Resource(
                        uri=f"agent-storage://{STORAGE_URL}/{asset_id}",
                        metadata={"mime_type": "image/png", "role": "generated-image"},
                    ),
                )
            )
        else:
            content.append(TextContent(type="text", text="(cat card image: add AGENTVERSE_API_KEY to .env to see it)"))
    return content


async def _send(ctx: Context, receiver: str, parts: list[dict]):
    content = _to_content(parts, receiver) + [EndSessionContent(type="end-session")]
    await ctx.send(receiver, ChatMessage(timestamp=datetime.now(timezone.utc), msg_id=uuid4(), content=content))


@chat.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(sender, ChatAcknowledgement(acknowledged_msg_id=msg.msg_id, timestamp=datetime.now(timezone.utc)))
    text = msg.text().strip()
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(f"{BOT_URL}/chat", json={"user": sender, "text": text})
            res.raise_for_status()
            parts = res.json()["parts"]
    except Exception as exc:
        ctx.logger.exception("meow bot unreachable")
        parts = [{"type": "text", "text": f"The meow bot is napping (couldn't reach it: {exc}). Try again soon."}]
    await _send(ctx, sender, parts)


@chat.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


# Battle requests and gifted cats from other players (including iMessage players) arrive here.
@agent.on_interval(period=3.0)
async def deliver_outbox(ctx: Context):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            messages = (await client.get(f"{BOT_URL}/outbox")).json()["messages"]
    except Exception:
        return
    for m in messages:
        await _send(ctx, m["user"], m["parts"])


agent.include(chat, publish_manifest=True)

if __name__ == "__main__":
    print(f"meow agent address: {agent.address}")
    print(f"images: {'Agentverse storage' if storage else 'off (no AGENTVERSE_API_KEY)'}")
    agent.run()
