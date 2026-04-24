# KanFlow - A modernized Kanban Todo List App

A modern, interactive drag-and-drop Kanban board web application built with vanilla HTML, CSS, and JavaScript. This app helps you organize and manage your tasks across three workflow stages: To Do, In Progress, and Done.

## Features

### Core Functionality
- **Three-Column Kanban Board**: Organize tasks into To Do, In Progress, and Done columns
- **Drag & Drop**: Seamlessly move cards between columns to update task status
- **Create Cards**: Add new tasks to any column with a simple modal interface
- **Delete with Safety**: Delete cards with a recovery option before permanent deletion
- **Trash Management**: Access, restore, or permanently delete items from trash
- **Progress Tracking**: Visual progress bars show the distribution of cards across columns
- **Data Persistence**: All changes are automatically saved to localStorage and survive browser restarts

### User Interface
- Clean, modern design with intuitive controls
- Responsive layout that works on desktop and mobile devices
- Color-coded cards for visual organization
- Prominent yellow trash drop zone at the bottom of the page
- Easy-to-use modal dialogs for card creation

## How to Use

### Getting Started
1. Open `index.html` in any modern web browser
2. The application loads your saved data automatically

### Creating Tasks
1. Click the **"Add Card"** button in any column (To Do, In Progress, or Done)
2. Enter a descriptive title for your task in the modal dialog
3. Click **"Save"** to add the card to that column
4. The task is automatically saved and will persist between sessions

### Managing Tasks
- **Move Between Columns**: Click and drag any card to move it to a different column
- **Delete a Card**: Click the red **×** button on any card to delete it (moves to trash)
- **Drag to Trash**: Alternatively, drag a card directly to the yellow trash zone at the bottom of the page

### Accessing Deleted Items
1. Click the **"View Deleted Items"** button at the top of the page
2. A modal window will open showing all deleted items with:
   - Task title
   - Original column (To Do, In Progress, or Done)
   - Deletion timestamp
3. Each deleted item has a **"Restore"** button to return it to its original column
4. Click **"Empty Trash"** to permanently delete all items (this action cannot be undone)

### Progress Tracking
- Each column displays a progress bar at the top showing:
  - Visual representation of cards in that column
  - Exact number of cards
  - Percentage of total cards in the project

## Files

- **`index.html`** - Main HTML structure with semantic markup
- **`style.css`** - Complete styling including responsive design and animations
- **`script.js`** - All JavaScript functionality (drag-and-drop, modal management, localStorage)
- **`CLAUDE.md`** - Technical architecture documentation for developers

## Customization

### Changing Colors
Edit the CSS in `style.css` to customize the appearance:
- Column headers and cards: Modify `.column`, `.card` styles
- Button colors: Change `.add-card`, `.card-delete-btn`, `.restore-btn` colors
- Trash zone: Customize `.trash-drop-zone` background and border colors

### Modifying Layout
- Column width: Adjust the `flex: 1` property in `.column`
- Card spacing: Modify `margin-bottom` and `padding` values
- Mobile breakpoint: Change the media query breakpoint (currently 768px)

## Browser Compatibility

This application uses modern web standards and is compatible with:
- Chrome/Chromium (v90+)
- Firefox (v88+)
- Safari (v14+)
- Edge (v90+)

Required browser features:
- HTML5 support
- CSS3 (Flexbox, Grid, Transitions)
- JavaScript ES6+
- Drag and Drop API
- localStorage API

## Data Storage

All your data is stored locally in your browser's localStorage:
- Card content and positions
- Deleted items in trash
- Timestamps for when items were deleted
- Data is never sent to external servers

To clear all data, open your browser's developer console and run:
```javascript
localStorage.clear();
```

## Tips & Best Practices

1. **Regular Backups**: Since data is stored locally, use browser data export or screenshot important boards
2. **Column Organization**: Keep To Do for planned work, In Progress for active tasks, Done for completed work
3. **Clear Naming**: Use descriptive task titles for easy identification
4. **Clean Trash**: Periodically empty the trash to keep the application clean
5. **Mobile Usage**: The app is responsive but works best on desktop for drag-and-drop operations

## Known Limitations

- Data is stored per-browser per-device (not synced across devices)
- No built-in user accounts or cloud synchronization
- Limited to localStorage capacity (usually 5-10MB per domain)
- Drag-and-drop works best with mouse; touch support may vary

## Future Enhancement Ideas

Potential improvements for future versions:
- Card editing capabilities
- Due dates and reminders
- Card categories and tags
- Search and filter functionality
- Export to CSV or PDF
- Undo/redo functionality
- Dark mode theme
- Multi-user collaboration
- Cloud synchronization
- Card priority levels
- Recurring tasks

## Troubleshooting

### Cards not persisting after refresh
- Check if localStorage is enabled in your browser
- Ensure cookies/site data are not being cleared on exit

### Drag and drop not working
- Try using a different browser
- Disable browser extensions that might interfere
- Ensure JavaScript is enabled

### Deleted items not showing in trash
- Click "View Deleted Items" button at the top
- Check if you have JavaScript enabled

## License

This project is open-source and available for personal and commercial use.

## Support

For issues or suggestions, please review the code in `script.js` for implementation details or refer to `CLAUDE.md` for technical architecture documentation.
