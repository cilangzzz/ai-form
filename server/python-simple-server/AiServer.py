# -*- coding: utf-8 -*-
# -------------------------------
#
# @File：ai_chat_app.py
# @Time：2025/5/9
# @Author：cilang
# @Email：cilanguser@Gmail.com
# @Desc：提供AI聊天后端接口
import json
import os.path

from flask import Flask, request, jsonify
from tenacity import stop_after_attempt, retry

from Chat import ChatAssistant
# Import your AI chat assistant modules


import sys

sys.path.append(os.path.abspath("../../"))

app = Flask(__name__)

# AI Chat roles and configuration
role = [
    {"role": "system",
     "content": "你是一个前端开发专家，擅长根据表单结构生成符合格式要求的测试数据，只输出数据本身，不要解释。"},
    {"role": "user", "content": "请为以下表单元素生成符合格式要求的测试数据："},
    {"role": "assistant",
     "content": "请提供表单结构，包括：1.字段名称 2.字段类型(text/email/number等) 3.是否必填 4.格式要求(如密码强度) 5.取值范围(针对数字)"},
    {"role": "system",
     "content": "示例输出：对于『用户名：文本输入，必填，3-16个字符』,给出多个选择，输出：['username': 'testUser123','username': 'testUser123333',"
                "'username': 'testUser123333sd']"},
    {"role": "system",
     "content": "对于多个字段，输出格式：['username': 'testUser123', 'password': 'A1b@cD9eF', 'email': 'user123@example.com']"},
    {"role": "system",
     "content": "只输出符合要求的字段值，使用列表包裹，并用空格号分隔字段（如：['username': 'testUser123', 'password': 'A1b@cD9eF' 'email': "
                "'user123@example.com']）"},
    {"role": "system", "content": "密码字段自动生成强密码（如：A1b@cD9eF）"},
    {"role": "system", "content": "邮箱字段自动生成有效邮箱（如：user123@example.com）"},
    {"role": "system", "content": "数字字段按范围生成合理数值（如：1-100 → 28）"},
    {"role": "system", "content": "多选字段输出数组格式（如：hobbies: [reading, swimming]）"},
    {"role": "system", "content": "可以指定生成多条测试数据"},
    {"role": "system", "content": "支持生成符合或不符合规则的数据"}
]

jsonObj = json.load(open("./config.json", "r", encoding="utf-8"))
baseUrl = jsonObj["qwen-3-fast"]["server"]["url"]
apiKey = jsonObj["qwen-3-fast"]["key"]["key"]
proxy = jsonObj["qwen-3-fast"]["proxy"]["socket"]

transferAichatAssistant = ChatAssistant(apiKey, baseUrl, proxy=proxy, model="qwen-turbo-latest")
transferAichatAssistant.setRole(role)


@retry(stop=stop_after_attempt(5))
def transferRemark(userInput, context=None):
    if context is not None:
        response = transferAichatAssistant.chatSupplement(userInput, context)
    else:
        response = transferAichatAssistant.chatWithoutContext(userInput)
    # print(f"You: {userInput} Assistant: {response}")
    return response


@app.route('/ai/chat_remark', methods=['POST'])
def ai_chat_remark_api():
    """
    后端接口：接收 userInput，调用 AI remark 接口返回回复（列表格式）
    """
    try:
        user_input = request.form.get('userInput')
        context = request.form.get('chatContext')

        if not user_input:
            return jsonify({"success": False, "error": "userInput 不能为空"}), 400

        if context != "" and context is not None and context != "null":
            appendRole = {"role": "system", "content": context}
            ai_response = transferRemark(user_input, appendRole)
        else:
            ai_response = transferRemark(user_input)

        # 确保结果是列表形式，比如 ['username: testUser123']
        if isinstance(ai_response, str):
            ai_response_list = [ai_response]
        elif isinstance(ai_response, list):
            ai_response_list = ai_response
        else:
            ai_response_list = [str(ai_response)]

        return jsonify({"success": True, "data": {"response": ai_response_list}})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001, debug=True)
