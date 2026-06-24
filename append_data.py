import json

with open("backend/sample_data.json", "r") as f:
    data = json.load(f)

new_data = [
    {
        "instruction": "build a full stack website",
        "input": "",
        "output": "To build a full stack website, I need to know a few details first:\n1. What type of business or project is this for?\n2. What features should the website include?\n3. What's your preferred tech stack (e.g., React/Node, Vue/Django, Next.js)?\n\nPlease provide these details and I will generate the complete implementation for you."
    },
    {
        "instruction": "build a machine learning model",
        "input": "",
        "output": "To build a machine learning model, I need some specific details:\n1. What problem are you trying to solve (classification, regression, clustering)?\n2. What kind of dataset do you have (images, text, tabular data)?\n3. Do you have a framework preference (PyTorch, TensorFlow, Scikit-learn)?\n\nPlease let me know so I can write the complete model architecture and training code."
    },
    {
        "instruction": "create an ai agent",
        "input": "",
        "output": "To create an AI agent, please provide the following details:\n1. What is the main objective or task of the agent?\n2. What tools or APIs does the agent need access to?\n3. Which framework do you prefer (LangChain, AutoGen, custom)?\n\nOnce you answer, I will provide the full code implementation."
    },
    {
        "instruction": "create a database",
        "input": "",
        "output": "Before I write the database implementation, I need to know:\n1. Do you need a relational (SQL) or NoSQL database?\n2. What kind of data will you be storing?\n3. Is this for local development or production deployment?\n\nLet me know and I will provide the schema and setup code."
    },
    {
        "instruction": "build a full stack website for an e-commerce store using Next.js and Tailwind",
        "input": "",
        "output": "Here is a complete setup for an e-commerce store using Next.js and Tailwind CSS.\n\nFirst, create the project:\n```bash\nnpx create-next-app@latest ecommerce-store --tailwind\n```\n\nThen, replace `pages/index.js` with this code:\n```jsx\nexport default function Home() {\n  return (\n    <div className=\"min-h-screen bg-gray-100 p-8\">\n      <h1 className=\"text-4xl font-bold text-center mb-8\">My E-Commerce Store</h1>\n      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">\n        {[1, 2, 3].map(i => (\n          <div key={i} className=\"bg-white p-6 rounded-lg shadow-md\">\n            <div className=\"h-48 bg-gray-200 rounded mb-4\"></div>\n            <h2 className=\"text-xl font-semibold mb-2\">Product {i}</h2>\n            <p className=\"text-gray-600 mb-4\">Amazing product description here.</p>\n            <button className=\"bg-blue-600 text-white px-4 py-2 rounded w-full\">Add to Cart</button>\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n}\n```\nThis gives you a responsive product grid out of the box."
    },
    {
        "instruction": "create an ai agent for customer support using langchain",
        "input": "",
        "output": "Here is a complete customer support AI agent using LangChain:\n\n```python\nfrom langchain.chat_models import ChatOpenAI\nfrom langchain.agents import initialize_agent, AgentType\nfrom langchain.tools import Tool\n\n# Define the LLM\nllm = ChatOpenAI(temperature=0)\n\n# Define tools the agent can use\ndef check_order_status(order_id):\n    return f\"Order {order_id} is shipped.\"\n\ntools = [\n    Tool(\n        name=\"OrderTracker\",\n        func=check_order_status,\n        description=\"Use this to check the status of a customer order.\"\n    )\n]\n\n# Initialize the agent\nagent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION, verbose=True)\n\n# Run the agent\nresponse = agent.run(\"Where is my order #12345?\")\nprint(response)\n```\nThis agent will autonomously use the OrderTracker tool to fulfill the user's request."
    }
]

data.extend(new_data)

with open("backend/sample_data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Appended successfully.")
