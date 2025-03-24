# IntelliBrowse Agent

IntelliBrowse is an autonomous AI-driven web agent capable of performing complex web navigation tasks from natural language instructions.

## Core Technologies

- **Fireworks AI (DeepSeek R1)** - For reasoning and multimodal understanding
- **Browserbase Stagehand** - For browser automation
- **Microsoft OmniParser** - For vision-based screen parsing
- **Document Inlining** - For multimodal reasoning

## Features

- Take high-level natural language instructions from users
- Break down complex web tasks into atomic actions
- Execute browser automation commands
- Parse and extract structured data from web content
- Reason over inline documents to make decisions
- Present results in a user-friendly format

## Setup

### Prerequisites

- Node.js v18+
- Fireworks AI API key
- Browserbase/Stagehand API keys
- OpenAI API key (for Stagehand's internal operations)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/intellibrowse-agent.git
   cd intellibrowse-agent
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Then edit `.env` and add your API keys.

4. Start the development server:
   ```
   npm run dev
   ```

## Architecture

IntelliBrowse follows a ReAct-pattern architecture:

1. **Reasoning** - The agent reasons about how to accomplish a task
2. **Action** - The agent takes an action using browser automation
3. **Observation** - The agent observes the results
4. **Repeat** - The cycle continues until the task is complete

## Usage

Simply provide a natural language instruction, and the agent will:

1. Break it down into steps
2. Execute the necessary browser actions
3. Extract the required information
4. Present the results in a structured format

## License

MIT 