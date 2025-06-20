import os
from dotenv import load_dotenv
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

load_dotenv()

def load_context():
    with open("campus_features.txt", "r") as f:
        return f.read()

def ask_assistant(user_question):
    context = load_context()
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
You are a helpful assistant for the CampusConnect app.

Here is the description of the app's features and how they work:
{context}

Answer the user's question based on this information:
User: {question}
Assistant:
"""
    )
    chain = LLMChain(llm=ChatOpenAI(temperature=0.2), prompt=prompt)
    return chain.run({"context": context, "question": user_question})
