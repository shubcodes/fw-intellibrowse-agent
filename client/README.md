# IntelliBrowse Client

This is the React frontend for the IntelliBrowse agent. It provides a user-friendly interface for interacting with the autonomous web agent.

## Features

- Chat interface for natural language instructions
- Real-time visualization of browser automation
- Streaming responses from the agent
- Visual highlighting of interactive elements on web pages
- Responsive design for desktop and mobile devices

## Project Structure

```
client/
├── public/           # Static files
├── src/              # Source code
│   ├── components/   # React components
│   │   ├── ChatInterface.jsx       # Chat UI component
│   │   └── BrowserVisualization.jsx # Browser visualization component
│   ├── services/     # API and service integrations
│   │   └── agentApi.js             # Client for communicating with backend
│   ├── styles/       # CSS styles
│   │   ├── App.css
│   │   ├── ChatInterface.css
│   │   └── BrowserVisualization.css
│   ├── App.jsx       # Main application component
│   └── index.js      # Application entry point
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend server running (see main project README)

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Create a `.env` file in the client directory with these variables:

```
REACT_APP_API_URL=http://localhost:3001/api
```

## Development

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App

### Adding New Components

1. Create a new component in the `src/components` directory
2. Import and use it in App.jsx or another component
3. Add styles in the `src/styles` directory

### State Management

The application uses React's built-in state management with hooks. For more complex state needs, consider adding a state management library like Redux or Zustand.

### API Integration

The `agentApi.js` service handles all communication with the backend:

- `AgentAPI.createSession()` - Creates a new agent session
- `AgentAPI.processInstruction()` - Processes a user instruction
- `AgentAPI.processInstructionStream()` - Streams responses from the agent
- `AgentAPI.getScreenshot()` - Gets the current browser screenshot

### Styling

The application uses CSS modules for styling. Each component has its own CSS file in the `styles` directory.

## Docker

You can run the client in a Docker container:

```
docker build -f Dockerfile.client -t intellibrowse-client .
docker run -p 3000:3000 -e REACT_APP_API_URL=http://localhost:3001/api intellibrowse-client
```

Or use docker-compose from the project root:

```
docker-compose up client
```

## Contributing

1. Follow the existing code style and organization
2. Add comments to explain complex logic
3. Update this README with any new features or dependencies
4. Test your changes thoroughly before submitting a pull request 