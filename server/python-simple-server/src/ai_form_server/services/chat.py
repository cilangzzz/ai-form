# -*- coding: utf-8 -*-
# -------------------------------
# @File: chat.py
# @Time: 2025/03/17
# @Author: cilang
# @Email: cilanguser@Gmail.com
# @Desc: AI chat assistant service
# -------------------------------
"""
AI Chat Assistant service for OpenAI-compatible APIs.

Provides conversation management and various chat modes including
contextual conversations and one-off queries.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

import httpx
from openai import APIConnectionError, APIError, AuthenticationError, RateLimitError
from openai import OpenAI

logger = logging.getLogger(__name__)


class ChatAssistant:
    """
    AI Chat Assistant wrapper for OpenAI-compatible APIs.

    Provides conversation management and various chat modes including
    contextual conversations and one-off queries.

    Attributes:
        model: The model name to use for completions
        conversation_history: List of conversation messages

    Example:
        >>> assistant = ChatAssistant(
        ...     api_key="your-api-key",
        ...     base_url="https://api.openai.com/v1",
        ...     model="gpt-4"
        ... )
        >>> assistant.add_user_message("Hello!")
        >>> response = assistant.get_assistant_response()
    """

    def __init__(
        self,
        api_key: str,
        base_url: str,
        proxy: Optional[str] = None,
        model: str = "deepseek-chat",
        timeout: float = 60.0,
    ) -> None:
        """
        Initialize the ChatAssistant.

        Args:
            api_key: API key for authentication
            base_url: Base URL for the API endpoint
            proxy: Optional proxy URL (e.g., "http://127.0.0.1:7897")
            model: Model name to use for completions
            timeout: Request timeout in seconds
        """
        self.model = model
        self.conversation_history: List[Dict[str, str]] = []

        # Configure HTTP client with optional proxy
        if proxy:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                http_client=httpx.Client(
                    proxy=proxy,
                    transport=httpx.HTTPTransport(local_address="0.0.0.0"),
                    timeout=timeout,
                ),
            )
            logger.info(f"ChatAssistant initialized with proxy: {proxy}")
        else:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                timeout=timeout,
            )
            logger.info("ChatAssistant initialized without proxy")

        logger.info(f"Using model: {self.model}")

    def set_role(self, role: List[Dict[str, str]]) -> None:
        """
        Set the conversation role/history.

        Args:
            role: List of message dictionaries to set as conversation history
        """
        self.conversation_history = role.copy()
        logger.debug(f"Role set with {len(role)} messages")

    def add_role(self, role: str) -> None:
        """
        Add a system role message to the conversation.

        Args:
            role: System message content to add
        """
        self.conversation_history.append({"role": "system", "content": role})
        logger.debug("Added system role message")

    def add_user_message(self, message: str) -> None:
        """
        Add a user message to the conversation history.

        Args:
            message: User message content
        """
        self.conversation_history.append({"role": "user", "content": message})
        logger.debug(f"Added user message: {message[:50]}...")

    def get_assistant_response(self) -> str:
        """
        Get assistant response based on current conversation history.

        Returns:
            Assistant's response content as string

        Raises:
            AuthenticationError: If API authentication fails
            RateLimitError: If rate limit is exceeded
            APIConnectionError: If connection to API fails
            APIError: For other API errors
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.conversation_history,
                stream=False,
            )
            assistant_message = response.choices[0].message.content or ""
            self.conversation_history.append(
                {"role": "assistant", "content": assistant_message}
            )
            logger.debug(f"Received assistant response: {assistant_message[:50]}...")
            return assistant_message

        except AuthenticationError as e:
            logger.error(f"Authentication error: {e}")
            raise
        except RateLimitError as e:
            logger.error(f"Rate limit exceeded: {e}")
            raise
        except APIConnectionError as e:
            logger.error(f"API connection error: {e}")
            raise
        except APIError as e:
            logger.error(f"API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in get_assistant_response: {e}")
            raise

    def chat_without_context(self, user_input: str) -> str:
        """
        Chat without persisting to conversation history.

        Args:
            user_input: User's input message

        Returns:
            Assistant's response content as string
        """
        try:
            messages = [{"role": "user", "content": user_input}] + self.conversation_history
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False,
            )
            assistant_message = response.choices[0].message.content or ""
            logger.debug(f"chat_without_context response: {assistant_message[:50]}...")
            return assistant_message

        except Exception as e:
            logger.error(f"Error in chat_without_context: {e}")
            raise

    def chat_supplement(self, user_input: str, context: Dict[str, str]) -> str:
        """
        Chat with additional context supplement.

        Args:
            user_input: User's input message
            context: Additional context as a message dictionary

        Returns:
            Assistant's response content as string
        """
        try:
            history_with_context = self.conversation_history + [context]
            messages = [{"role": "user", "content": user_input}] + history_with_context
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False,
            )
            assistant_message = response.choices[0].message.content or ""
            logger.debug(f"chat_supplement response: {assistant_message[:50]}...")
            return assistant_message

        except Exception as e:
            logger.error(f"Error in chat_supplement: {e}")
            raise

    def clear_history(self) -> None:
        """Clear the conversation history."""
        self.conversation_history = []
        logger.debug("Conversation history cleared")

    def get_history(self) -> List[Dict[str, str]]:
        """
        Get a copy of the current conversation history.

        Returns:
            Copy of conversation history
        """
        return self.conversation_history.copy()


def create_chat_assistant(
    api_key: str,
    base_url: str,
    proxy: Optional[str] = None,
    model: str = "deepseek-chat",
) -> ChatAssistant:
    """
    Factory function to create a ChatAssistant instance.

    Args:
        api_key: API key for authentication
        base_url: Base URL for the API endpoint
        proxy: Optional proxy URL
        model: Model name to use

    Returns:
        Configured ChatAssistant instance
    """
    return ChatAssistant(
        api_key=api_key,
        base_url=base_url,
        proxy=proxy,
        model=model,
    )


__all__ = [
    "ChatAssistant",
    "create_chat_assistant",
]