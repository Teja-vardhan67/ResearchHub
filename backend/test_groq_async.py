
import os
import asyncio
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
        completion = await client.chat.completions.create(
            messages=[{"role": "user", "content": "Hello"}],
            model="llama-3.3-70b-versatile"
        )
        print("Success:", completion.choices[0].message.content)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
