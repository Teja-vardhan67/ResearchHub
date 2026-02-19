import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = Groq(
    api_key=GROQ_API_KEY,
)

def get_chat_response(messages, model="llama-3.3-70b-versatile", temperature=0.3):
    """
    Generates a response from Groq based on the message history.
    """
    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model=model,
            temperature=temperature,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return "I apologize, but I encountered an error while processing your request."
