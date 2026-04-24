# KanFlow - Modern Kanban Task Board

A beautiful, responsive drag-and-drop Kanban board application built with vanilla HTML, CSS, and JavaScript. Organize your tasks across three workflow stages with an intuitive interface that works on all devices.

## 🌐 Live Demo

**Deployment Link**: [https://kan-flow-ivory.vercel.app/](https://kan-flow-ivory.vercel.app/)

## ✨ Features

### Core Functionality
- **Three-Column Board**: Manage tasks in To Do, In Progress, and Done columns
- **Drag & Drop**: Simply drag cards between columns to update status
- **Create Tasks**: Add new tasks using the "Add Card" button in any column
- **Safe Deletion**: Deleted items go to trash for recovery before permanent removal
- **Restore Items**: Bring back deleted tasks to any column you choose
- **Progress Tracking**: Visual progress bars show task distribution across columns
- **Auto-Save**: All changes save automatically to your browser's local storage

### Visual Design
- Clean, modern gradient interface
- Smooth animations and hover effects
- Card count badges for each column
- Empty state messages with helpful icons
- Floating trash bin for easy deletion
- Fully responsive on all screen sizes

## 📱 How to Use

### Getting Started
1. Open `index.html` in any modern web browser
2. Your tasks will load automatically from previous sessions

### Creating Tasks
1. Click the **"Add Card"** button in any column
2. Type your task title in the popup window
3. Press **"Create Task"** or hit **Enter** on your keyboard
4. Your new card appears instantly

### Moving Tasks
- **Drag & Drop**: Click and hold any card, then drag it to another column
- Release the mouse button to drop it in place

### Deleting Tasks
- **Delete Button**: Click the **×** button on any card to send it to trash
- **Drag to Trash**: Drag any card to the floating trash bin at the bottom-right corner

### Managing Trash
1. Click the **trash button** (🗑️) in the top-right corner of the header
2. You'll see all deleted items with their original column and deletion date
3. To restore an item:
   - Select a column from the dropdown menu
   - Click the **"Restore"** button
4. To permanently delete all items:
   - Click **"Empty Trash Permanently"** at the bottom
   - Confirm the action (this cannot be undone)

### Understanding Progress Bars
Each column shows:
- A colored progress bar showing percentage of total tasks
- Percentage number (e.g., "25%")
- Card count badge showing number of tasks in that column

## 📂 Project Files

| File | Description |
|------|-------------|
| `index.html` | Main page structure with all UI elements |
| `style.css` | Complete styling including responsive design and animations |
| `script.js` | All JavaScript functionality (drag & drop, modals, save/load) |

## 🎨 Customization Guide

### Changing Colors
Open `style.css` and modify these sections:

```css
/* Main gradient background */
body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

/* Card background and shadows */
.card { background: white; border-radius: 16px; }

/* Button gradients */
.add-card { background: linear-gradient(135deg, #667eea, #764ba2); }

/* Trash bin */
.trash-drop-zone { background: linear-gradient(135deg, #f39c12, #e67e22); }
