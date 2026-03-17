# -*- coding: utf-8 -*-
# -------------------------------
#
# @File：Chat.py
# @Time：2025/5/9
# @Author：cilang
# @Email：cilanguser@Gmail.com
# @Desc：AI聊天助手封装类
import logging
from typing import Optional, List, Dict

import httpx
from openai import OpenAI, APIError, APIConnectionError, RateLimitError, AuthenticationError

# Configure logging
logger = logging.getLogger(__name__)


class ChatAssistant:
    """
    AI Chat Assistant wrapper for OpenAI-compatible APIs.

    Provides conversation management and various chat modes including
    contextual conversations and one-off queries.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str,
        proxy: Optional[str] = None,
        model: str = "deepseek-chat"
    ):
        """
        Initialize the ChatAssistant.

        Args:
            api_key: API key for authentication
            base_url: Base URL for the API endpoint
            proxy: Optional proxy URL (e.g., "http://127.0.0.1:7897")
            model: Model name to use for completions
        """
        self.model = model
        self.conversationHistory: List[Dict[str, str]] = []

        # Configure HTTP client with optional proxy
        if proxy:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                http_client=httpx.Client(
                    proxy=proxy,
                    transport=httpx.HTTPTransport(local_address="0.0.0.0"),
                    timeout=60.0  # Set reasonable timeout
                )
            )
            logger.info(f"ChatAssistant initialized with proxy: {proxy}")
        else:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                timeout=60.0
            )
            logger.info("ChatAssistant initialized without proxy")

        logger.info(f"Using model: {self.model}")

    def setRole(self, role: List[Dict[str, str]]) -> None:
        """
        Set the conversation role/history.

        Args:
            role: List of message dictionaries to set as conversation history
        """
        self.conversationHistory = role.copy()
        logger.debug(f"Role set with {len(role)} messages")

    def addRole(self, role: str) -> None:
        """
        Add a system role message to the conversation.

        Args:
            role: System message content to add
        """
        self.conversationHistory.append({"role": "system", "content": role})
        logger.debug(f"Added system role message")

    def addUserMessage(self, message: str) -> None:
        """
        Add a user message to the conversation history.

        Args:
            message: User message content
        """
        self.conversationHistory.append({"role": "user", "content": message})
        logger.debug(f"Added user message: {message[:50]}...")

    def getAssistantResponse(self) -> str:
        """
        Get assistant response based on current conversation history.

        Returns:
            Assistant's response content as string
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,  # Use instance model instead of hardcoded value
                messages=self.conversationHistory,
                stream=False
            )
            assistant_message = response.choices[0].message.content
            self.conversationHistory.append({"role": "assistant", "content": assistant_message})
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
            logger.error(f"Unexpected error in getAssistantResponse: {e}")
            raise

    def chatWithoutContext(self, userInput: str) -> str:
        """
        Chat without persisting to conversation history.

        Args:
            userInput: User's input message

        Returns:
            Assistant's response content as string
        """
        try:
            messages = [{"role": "user", "content": userInput}] + self.conversationHistory
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False
            )
            assistant_message = response.choices[0].message.content
            logger.debug(f"chatWithoutContext response: {assistant_message[:50]}...")
            return assistant_message
        except Exception as e:
            logger.error(f"Error in chatWithoutContext: {e}")
            raise

    def chatSupplement(self, userInput: str, context: Dict[str, str]) -> str:
        """
        Chat with additional context supplement.

        Args:
            userInput: User's input message
            context: Additional context as a message dictionary

        Returns:
            Assistant's response content as string
        """
        try:
            history_with_context = self.conversationHistory + [context]
            messages = [{"role": "user", "content": userInput}] + history_with_context
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False
            )
            assistant_message = response.choices[0].message.content
            logger.debug(f"chatSupplement response: {assistant_message[:50]}...")
            return assistant_message
        except Exception as e:
            logger.error(f"Error in chatSupplement: {e}")
            raise

    def clearHistory(self) -> None:
        """Clear the conversation history."""
        self.conversationHistory = []
        logger.debug("Conversation history cleared")

    def getHistory(self) -> List[Dict[str, str]]:
        """
        Get a copy of the current conversation history.

        Returns:
            Copy of conversation history
        """
        return self.conversationHistory.copy()


if __name__ == '__main__':
    import os

    # Example usage - requires API key to be set
    api_key = os.getenv('AI_API_KEY', '')
    base_url = os.getenv('AI_BASE_URL', 'https://api.deepseek.com')
    model = os.getenv('AI_MODEL_NAME', 'deepseek-chat')

    if not api_key:
        print("Please set AI_API_KEY environment variable")
        exit(1)

    chatAssistant = ChatAssistant(api_key, base_url, model=model)

    # Interactive chat loop
    print("AI Chat Assistant (type 'exit' or 'quit' to quit)")
    print("-" * 40)

    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ["exit", "quit"]:
                print("Exiting chat...")
                break

            chatAssistant.addUserMessage(user_input)
            response = chatAssistant.getAssistantResponse()
            print(f"Assistant: {response}")
        except KeyboardInterrupt:
            print("\nExiting chat...")
            break
        except Exception as e:
            print(f"Error: {e}")
            break