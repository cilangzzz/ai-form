# Please install OpenAI SDK first: `pip3 install openai`
import httpx
from openai import OpenAI





from openai import OpenAI

from Roles import SYSTEM_PROMPT_GENERATION_ROLE


class ChatAssistant:
    def __init__(self, apiKey, baseUrl, proxy=None, model="deepseek-chat"):
        if proxy:
            self.client = OpenAI(api_key=apiKey,
                                 base_url=baseUrl,
                                 http_client=httpx.Client(
                                     proxy=proxy,
                                     transport=httpx.HTTPTransport(local_address="0.0.0.0")
                                 )
                                 )
        else:
            self.client = OpenAI(api_key=apiKey,
                                 base_url=baseUrl
                                 )
        self.conversationHistory = [
        ]
        self.model = model
    def setRole(self, role):
        self.conversationHistory.clear()
        self.conversationHistory = role

    def addRole(self, role):
        self.conversationHistory.append({"role": "system", "content": role})

    def addUserMessage(self, message):
        self.conversationHistory.append({"role": "user", "content": message})

    def getAssistantResponse(self):
        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=self.conversationHistory,
            stream=False
        )
        assistantMessage = response.choices[0].message.content
        self.conversationHistory.append({"role": "assistant", "content": assistantMessage})
        return assistantMessage

    def chatWithoutContext(self, userInput):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": userInput}] + self.conversationHistory
            ,
            stream=False
        )
        assistantMessage = response.choices[0].message.content
        return assistantMessage

    def chatSupplement(self, userInput, context):
        his = self.conversationHistory + [context]
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": userInput}] + his
            ,
            stream=False
        )
        assistantMessage = response.choices[0].message.content
        return assistantMessage


if __name__ == '__main__':

    # 使用示例
    apiKey = ""  # 替换为你的 API 密钥
    baseUrl = "https://api.deepseek.com"
    chatAssistant = ChatAssistant(apiKey, baseUrl)

    chatAssistant.setRole(SYSTEM_PROMPT_GENERATION_ROLE)
    while True:
        userInput = input("You: ")
        if userInput.lower() in ["exit", "quit"]:
            print("Exiting chat...")
            break
        chatAssistant.addUserMessage(userInput)
        response = chatAssistant.getAssistantResponse()
        print(f"Assistant: {response}")
