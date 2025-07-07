# Tracklet Annotation Tool

A cross-platform desktop application for annotating tracklet IDs in video frames, built with Electron, Next.js, and Tailwind CSS.

## Features

- **Three-column responsive layout** with intuitive navigation
- **Real-time bounding box drawing and editing** on 1920x1080 image frames
- **Automatic file saving** with visual feedback indicators
- **Keyboard shortcuts** for efficient workflow (Z/X for frame navigation, D/A for annotation modes)
- **Directory tree navigation** for managing multiple rally datasets
- **Tracklet ID management** with custom ID support
- **Secure file system access** through Electron IPC

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Desktop**: Electron for native functionality and file system access
- **State Management**: Zustand for efficient global state management
- **Canvas**: HTML5 Canvas for image display and bounding box interaction
- **Icons**: Heroicons for consistent UI components

## Data Format

The application expects annotation files in CSV format with the following columns (no header required):
```
frame,tracklet_id,x,y,w,h,score,role,jersey_number,jersey_color,team
```

Each line represents one annotation with:
- `frame`: Frame number (extracted from image filename, e.g., 000001.jpg = frame 1)
- `tracklet_id`: Unique identifier for the tracklet
- `x,y`: Top-left corner coordinates of bounding box
- `w,h`: Width and height of bounding box
- `score`: Confidence score (typically 1.0 for manual annotations)
- `role`: Role/category (e.g., "player", can be empty)
- `jersey_number`: Player's jersey number (can be empty)
- `jersey_color`: Color of the jersey (can be empty)
- `team`: Team identifier (e.g., "home", "away", can be empty)

### Expected Directory Structure

```
selected_directory/
├── sets_1/
│   ├── rally_1/
│   │   ├── annotations.txt
│   │   ├── 000001.jpg
│   │   ├── 000002.jpg
│   │   └── ...
│   ├── rally_2/
│   │   └── ...
│   └── ...
└── ...
```

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd trackletanno
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Web Development
```bash
npm run dev
```
This starts the Next.js development server at `http://localhost:3000`.

### Electron Development
```bash
npm run electron-dev
```
This starts both the Next.js development server and Electron application.

### Building for Production
```bash
npm run build-electron
```
This creates a production build and packages the Electron application.

## Usage

### Getting Started

1. **Launch the application** using one of the development commands above
2. **Select a directory** containing your tracklet annotation data using the "Search Directory" button
3. **Navigate the directory tree** in the left sidebar to select a rally folder
4. **Select a tracklet ID** from the right sidebar before starting annotation

### Annotation Workflow

#### Drawing New Bounding Boxes
1. Select a tracklet ID from the right sidebar
2. Click "Draw New Bounding Box" in the left sidebar (or press 'D')
3. Click and drag on the main canvas to draw a new bounding box
4. The bounding box will be automatically assigned to the selected tracklet ID

#### Assigning Existing Bounding Boxes
1. Select a tracklet ID from the right sidebar
2. Click "Assign Tracklet ID" in the left sidebar (or press 'A')
3. Click on an existing bounding box to reassign it to the selected tracklet ID

#### Navigation
- **Z key**: Navigate to previous frame
- **X key**: Navigate to next frame
- **D key**: Toggle drawing mode
- **A key**: Toggle assign mode

### File Management

- **Automatic saving**: All changes are automatically saved to the original annotation file
- **Save indicators**: Visual feedback shows saving status (saving/saved/error)
- **File validation**: The application validates annotation file format on load

## Component Overview

### Key Components

- **DirectorySelector**: Initial screen for selecting annotation data directory
- **LeftSidebar**: Contains annotation controls and directory tree navigation
- **MainCanvas**: Handles image display, bounding box drawing, and annotation interactions
- **RightSidebar**: Manages tracklet ID selection and display
- **LoadingSpinner**: Shows loading state during file operations
- **SaveIndicator**: Provides visual feedback for save operations

### State Management

The application uses Zustand for state management with the following key stores:

- **Directory and data management**: Selected directory, rally folders, current frame
- **UI state**: Drawing mode, assign mode, selected elements, loading states
- **Canvas state**: Bounding boxes, selections, annotations
- **Actions**: Frame navigation, annotation operations, file operations

## Electron Integration

The application uses Electron's IPC (Inter-Process Communication) for secure file operations:

- **Main process** (`electron/main.js`): Handles file I/O, directory selection, and native OS interactions
- **Preload script** (`electron/preload.js`): Provides secure API bridge between main and renderer processes
- **Renderer process** (Next.js app): Handles UI and user interactions

### Security

- **Context isolation**: Renderer process cannot directly access Node.js APIs
- **Preload script**: Provides controlled access to file system operations
- **IPC validation**: All file operations are validated in the main process

## Troubleshooting

### Common Issues

1. **"This feature is only available in the desktop application"**
   - This message appears when running in web mode. Use `npm run electron-dev` for full functionality.

2. **"No rally folders found"**
   - Ensure your directory structure matches the expected format
   - Check that annotation files are named with `.txt` extension
   - Verify that image files have supported extensions (jpg, jpeg, png, bmp)

3. **Images not loading**
   - Check file paths and permissions
   - Ensure image files are in the same directory as annotation files
   - Verify image file formats are supported

## Development Notes

- The application is optimized for 1920x1080 image resolution
- Canvas coordinates are automatically scaled for display
- All file operations are performed through Electron's secure IPC mechanism
- State management is centralized through Zustand for predictable updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with sample data
5. Submit a pull request

## License

[Add your license information here]

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
