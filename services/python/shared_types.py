"""Shared type definitions for the Python service."""

from collections.abc import Awaitable, Callable
from typing import TypeAlias

from betterproto import Message

# Recursive JSON types (avoids Any)
JsonPrimitive: TypeAlias = str | int | float | bool | None
JsonValue: TypeAlias = dict[str, "JsonValue"] | list["JsonValue"] | JsonPrimitive
JsonObject: TypeAlias = dict[str, JsonValue]

# Message handler type
MessageHandler: TypeAlias = Callable[[Message], Awaitable[Message | None]]
