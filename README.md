# Architecture Wikigraph

An interactive 3D visualization of architecture-related Wikipedia articles and their connections.

## Features

- Interactive 3D force-directed graph visualization
- Wikipedia article crawling and data collection
- Real-time graph exploration
- Efficient data caching and validation
- Responsive design

## Tech Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Three.js / 3D-Force-Graph
- Tailwind CSS

### Backend
- Python 3.8+
- aiohttp for async Wikipedia API requests
- Next.js API Routes

## Project Structure

```
.
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── types/           # TypeScript type definitions
│   └── crawler/         # Python crawler implementation
├── public/              # Static files and graph data
└── data/               # Crawler data storage
```

## Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Set up Python environment:
```bash
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

3. Run the crawler:
```bash
python -m src.crawler
```

4. Start the development server:
```bash
npm run dev
```

## Development

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run linting

## Data Pipeline

1. Crawler starts from the "Architecture" Wikipedia page
2. Collects related articles up to depth 2
3. Exports graph data to `public/graph.json`
4. Frontend visualizes the data using 3D-Force-Graph

## License

MIT 