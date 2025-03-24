#!/bin/bash
# Setup script for IntelliBrowse Agent

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== IntelliBrowse Agent Setup ===${NC}"
echo -e "This script will help you set up your development environment."

# Check if Node.js is installed
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if which node > /dev/null; then
  node_version=$(node -v)
  echo -e "Node.js is installed: ${GREEN}$node_version${NC}"
else
  echo -e "${RED}Node.js is not installed. Please install Node.js v18 or higher.${NC}"
  echo -e "Visit: https://nodejs.org/en/download/"
  exit 1
fi

# Check if npm is installed
if which npm > /dev/null; then
  npm_version=$(npm -v)
  echo -e "npm is installed: ${GREEN}$npm_version${NC}"
else
  echo -e "${RED}npm is not installed. Please install npm.${NC}"
  exit 1
fi

# Check if Docker is installed (optional)
if which docker > /dev/null; then
  docker_version=$(docker --version)
  echo -e "Docker is installed: ${GREEN}$docker_version${NC}"
  
  if which docker-compose > /dev/null; then
    docker_compose_version=$(docker-compose --version)
    echo -e "Docker Compose is installed: ${GREEN}$docker_compose_version${NC}"
  else
    echo -e "${YELLOW}Docker Compose is not installed. This is optional but recommended.${NC}"
  fi
else
  echo -e "${YELLOW}Docker is not installed. This is optional but recommended for containerized development.${NC}"
  echo -e "Visit: https://docs.docker.com/get-docker/"
fi

# Create .env file if it doesn't exist
echo -e "\n${YELLOW}Setting up environment variables...${NC}"
if [ ! -f .env ]; then
  echo -e "Creating .env file from template..."
  cp .env.example .env
  echo -e "${GREEN}Created .env file. Please edit it with your API keys.${NC}"
else
  echo -e "The .env file already exists."
fi

# Install backend dependencies
echo -e "\n${YELLOW}Installing backend dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Backend dependencies installed successfully.${NC}"
else
  echo -e "${RED}Failed to install backend dependencies.${NC}"
  exit 1
fi

# Install frontend dependencies
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
if [ -d "client" ]; then
  cd client
  npm install
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Frontend dependencies installed successfully.${NC}"
    cd ..
  else
    echo -e "${RED}Failed to install frontend dependencies.${NC}"
    cd ..
    exit 1
  fi
else
  echo -e "${RED}Client directory not found.${NC}"
  exit 1
fi

# Setup completed
echo -e "\n${GREEN}=== Setup Completed ===${NC}"
echo -e "You can now start the development servers:"
echo -e "1. Backend: ${YELLOW}npm run server${NC}"
echo -e "2. Frontend: ${YELLOW}npm run client${NC}"
echo -e "3. Both: ${YELLOW}npm run dev:all${NC}"
echo -e "\nOr with Docker Compose:"
echo -e "${YELLOW}docker-compose up${NC}"
echo -e "\nMake sure to add your API keys to the ${YELLOW}.env${NC} file before starting the servers."
echo -e "${GREEN}Happy coding!${NC}" 