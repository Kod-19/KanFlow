// DOM Elements
const todoColumn = document.getElementById('todo-content');
const inprogressColumn = document.getElementById('inprogress-content');
const doneColumn = document.getElementById('done-content');

// Progress elements
const todoProgressBar = document.getElementById('todo-progress');
const todoProgressText = document.getElementById('todo-progress-text');
const inprogressProgressBar = document.getElementById('inprogress-progress');
const inprogressProgressText = document.getElementById('inprogress-progress-text');
const doneProgressBar = document.getElementById('done-progress');
const doneProgressText = document.getElementById('done-progress-text');

// Count badge elements
const todoCountBadge = document.getElementById('todo-count');
const inprogressCountBadge = document.getElementById('inprogress-count');
const doneCountBadge = document.getElementById('done-count');

// Trash elements
const viewTrashBtn = document.getElementById('view-trash-btn');
const trashPage = document.getElementById('trash-page');
const backFromTrashBtn = document.getElementById('back-from-trash');
const emptyTrashPageBtn = document.getElementById('empty-trash-page-btn');
const trashPageItems = document.getElementById('trash-page-items');

// Modal elements
const modal = document.getElementById('modal');
const closeBtn = document.querySelector('.close');
const cancelModalBtn = document.getElementById('cancel-modal');
const cardInput = document.getElementById('card-input');
const saveCardBtn = document.getElementById('save-card');

// State
let trashItems = [];
let currentColumn = null;
let draggedElement = null;

// Touch drag state for mobile (with scroll detection)
let touchStartX = 0;
let touchStartY = 0;
let touchDraggedCard = null;
let touchDragActive = false;
let touchClone = null;
let touchCurrentColumn = null;
let touchDropTarget = null;
let isScrolling = false;
let dragThresholdMet = false;
const DRAG_THRESHOLD = 10; // pixels to move before starting drag

// ==================== Helper Functions ====================

function updateColumnCounters() {
    const todoCount = todoColumn.querySelectorAll('.card').length;
    const inprogressCount = inprogressColumn.querySelectorAll('.card').length;
    const doneCount = doneColumn.querySelectorAll('.card').length;
    
    if (todoCountBadge) todoCountBadge.textContent = todoCount;
    if (inprogressCountBadge) inprogressCountBadge.textContent = inprogressCount;
    if (doneCountBadge) doneCountBadge.textContent = doneCount;
}

function updateProgressBars() {
    const todoCount = todoColumn.querySelectorAll('.card').length;
    const inprogressCount = inprogressColumn.querySelectorAll('.card').length;
    const doneCount = doneColumn.querySelectorAll('.card').length;
    const totalCount = todoCount + inprogressCount + doneCount;
    
    // Update To Do
    const todoPercent = totalCount > 0 ? (todoCount / totalCount) * 100 : 0;
    if (todoProgressBar) todoProgressBar.style.width = todoPercent + '%';
    if (todoProgressText) todoProgressText.textContent = `${Math.round(todoPercent)}%`;
    
    // Update In Progress
    const inprogressPercent = totalCount > 0 ? (inprogressCount / totalCount) * 100 : 0;
    if (inprogressProgressBar) inprogressProgressBar.style.width = inprogressPercent + '%';
    if (inprogressProgressText) inprogressProgressText.textContent = `${Math.round(inprogressPercent)}%`;
    
    // Update Done
    const donePercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
    if (doneProgressBar) doneProgressBar.style.width = donePercent + '%';
    if (doneProgressText) doneProgressText.textContent = `${Math.round(donePercent)}%`;
    
    updateColumnCounters();
    updateEmptyStates();
}

function updateEmptyStates() {
    updateColumnEmptyState(todoColumn, '✨', 'No tasks yet. Click "Add Card" to get started!');
    updateColumnEmptyState(inprogressColumn, '🚀', 'No tasks in progress. Drag a task here!');
    updateColumnEmptyState(doneColumn, '🏆', 'Completed tasks will appear here!');
}

function updateColumnEmptyState(column, icon, message) {
    const cards = column.querySelectorAll('.card');
    const existingEmpty = column.querySelector('.empty-state');
    
    if (cards.length === 0) {
        if (!existingEmpty) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `<span class="empty-icon">${icon}</span><p>${message}</p>`;
            column.appendChild(emptyState);
        }
    } else {
        if (existingEmpty) existingEmpty.remove();
    }
}

function updateTrashButton() {
    if (viewTrashBtn) {
        const countSpan = viewTrashBtn.querySelector('.trash-count');
        if (countSpan) {
            countSpan.textContent = trashItems.length;
        } else {
            viewTrashBtn.innerHTML = `<span class="trash-icon-small">🗑️</span><span class="trash-count">${trashItems.length}</span>`;
        }
    }
}

function saveState() {
    const cards = {};
    ['todo', 'inprogress', 'done'].forEach(col => {
        const container = document.getElementById(`${col}-content`);
        cards[col] = container.innerHTML;
    });
    
    const state = {
        todo: cards.todo,
        inprogress: cards.inprogress,
        done: cards.done,
        trash: JSON.stringify(trashItems)
    };
    localStorage.setItem('kanbanState', JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem('kanbanState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            todoColumn.innerHTML = state.todo || '';
            inprogressColumn.innerHTML = state.inprogress || '';
            doneColumn.innerHTML = state.done || '';
            trashItems = state.trash ? JSON.parse(state.trash) : [];
            
            // Reattach event listeners to all cards
            document.querySelectorAll('.card').forEach(card => {
                attachCardEvents(card);
            });
        } catch (e) {
            console.error('Failed to load state:', e);
            trashItems = [];
        }
    } else {
        trashItems = [];
    }
    
    updateProgressBars();
    updateTrashButton();
    updateTrashPageDisplay();
}

// ==================== Card Functions ====================

function attachCardEvents(card) {
    // Mouse events for desktop
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('dragend', dragEnd);
    
    // Touch events for mobile (with scroll detection)
    card.addEventListener('touchstart', touchDragStart, { passive: false });
    card.addEventListener('touchmove', touchDragMove, { passive: false });
    card.addEventListener('touchend', touchDragEnd);
    
    // Ensure delete button exists and has correct event
    let deleteBtn = card.querySelector('.card-delete-btn');
    if (!deleteBtn) {
        deleteBtn = document.createElement('button');
        deleteBtn.className = 'card-delete-btn';
        deleteBtn.setAttribute('aria-label', 'Delete card');
        deleteBtn.textContent = '×';
        card.appendChild(deleteBtn);
    }
    
    deleteBtn.onclick = function(e) {
        e.stopPropagation();
        const column = findCardColumn(card);
        if (column) deleteCard(card, column);
    };
}

function findCardColumn(card) {
    if (todoColumn.contains(card)) return 'todo';
    if (inprogressColumn.contains(card)) return 'inprogress';
    if (doneColumn.contains(card)) return 'done';
    return null;
}

function createCardElement(title, timestamp = null) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.innerHTML = `
        <h3>${escapeHtml(title)}</h3>
        <p>Added on ${timestamp || new Date().toLocaleDateString()}</p>
        <button class="card-delete-btn" aria-label="Delete card">×</button>
    `;
    attachCardEvents(card);
    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function addCardToColumn(columnId, text) {
    const card = createCardElement(text);
    let targetColumn;
    
    switch(columnId) {
        case 'todo': targetColumn = todoColumn; break;
        case 'inprogress': targetColumn = inprogressColumn; break;
        case 'done': targetColumn = doneColumn; break;
        default: targetColumn = todoColumn;
    }
    
    targetColumn.appendChild(card);
    saveState();
    updateProgressBars();
}

function deleteCard(cardElement, columnId) {
    const title = cardElement.querySelector('h3')?.textContent || 'Unknown Task';
    const cardData = {
        html: cardElement.outerHTML,
        column: columnId,
        title: title,
        timestamp: new Date().toLocaleString()
    };
    
    trashItems.push(cardData);
    cardElement.remove();
    saveState();
    updateProgressBars();
    updateTrashButton();
    updateTrashPageDisplay();
}

// ==================== Desktop Drag & Drop ====================

function dragStart(e) {
    draggedElement = e.target.closest('.card');
    if (!draggedElement) return;
    
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.effectAllowed = 'move';
    draggedElement.classList.add('dragging');
}

function dragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
    saveState();
    updateProgressBars();
}

function makeColumnDroppable(columnElement, columnId) {
    columnElement.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        columnElement.classList.add('dragover');
    });
    
    columnElement.addEventListener('dragleave', function(e) {
        columnElement.classList.remove('dragover');
    });
    
    columnElement.addEventListener('drop', function(e) {
        e.preventDefault();
        columnElement.classList.remove('dragover');
        
        if (draggedElement && draggedElement.classList.contains('card')) {
            columnElement.appendChild(draggedElement);
            saveState();
            updateProgressBars();
        }
    });
}

function makeTrashZoneDroppable() {
    const trashZone = document.getElementById('trash-drop-zone');
    
    trashZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        trashZone.classList.add('drag-over');
    });
    
    trashZone.addEventListener('dragleave', function(e) {
        trashZone.classList.remove('drag-over');
    });
    
    trashZone.addEventListener('drop', function(e) {
        e.preventDefault();
        trashZone.classList.remove('drag-over');
        
        if (draggedElement && draggedElement.classList.contains('card')) {
            const column = findCardColumn(draggedElement);
            if (column) deleteCard(draggedElement, column);
        }
    });
}

// ==================== Mobile Touch Drag & Drop (with scroll prioritization) ====================

function touchDragStart(e) {
    const card = e.target.closest('.card');
    if (!card) return;
    
    // Don't start drag if delete button was tapped
    if (e.target.classList.contains('card-delete-btn')) return;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchDraggedCard = card;
    touchDragActive = false; // Not active until threshold met
    isScrolling = false;
    dragThresholdMet = false;
}

function touchDragMove(e) {
    if (!touchDraggedCard) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // Check if user is trying to scroll vertically
    if (!isScrolling && !dragThresholdMet) {
        if (deltaY > DRAG_THRESHOLD && deltaY > deltaX) {
            // User is scrolling vertically - let scrolling happen
            isScrolling = true;
            touchDraggedCard = null;
            return;
        }
        
        // If horizontal movement exceeds threshold, start drag
        if (deltaX > DRAG_THRESHOLD && deltaX > deltaY) {
            dragThresholdMet = true;
            touchDragActive = true;
            isScrolling = false;
            e.preventDefault();
            
            // Start the drag
            touchCurrentColumn = findCardColumn(touchDraggedCard);
            
            // Add dragging class and create clone for visual feedback
            touchDraggedCard.classList.add('dragging');
            
            // Create a clone of the card for visual feedback during drag
            touchClone = touchDraggedCard.cloneNode(true);
            touchClone.style.position = 'fixed';
            touchClone.style.top = `${touch.clientY}px`;
            touchClone.style.left = `${touch.clientX}px`;
            touchClone.style.width = `${touchDraggedCard.offsetWidth}px`;
            touchClone.style.opacity = '0.8';
            touchClone.style.pointerEvents = 'none';
            touchClone.style.zIndex = '9999';
            touchClone.style.transform = 'translate(-50%, -50%)';
            touchClone.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
            document.body.appendChild(touchClone);
            
            // Hide original card but keep its space
            touchDraggedCard.style.opacity = '0.3';
            
            // Add visual indicators for drop targets
            document.querySelectorAll('.column-content').forEach(col => {
                col.classList.add('drag-target-ready');
            });
            document.getElementById('trash-drop-zone').classList.add('drag-target-ready');
        }
    }
    
    // If drag is active, move the clone and find drop targets
    if (touchDragActive && touchClone) {
        e.preventDefault();
        
        // Move the clone
        touchClone.style.top = `${touch.clientY}px`;
        touchClone.style.left = `${touch.clientX}px`;
        
        // Find drop target under finger
        const elementAtCursor = document.elementFromPoint(touch.clientX, touch.clientY);
        const columnContent = elementAtCursor?.closest('.column-content');
        const trashZone = elementAtCursor?.closest('#trash-drop-zone');
        
        // Remove highlight from all targets
        document.querySelectorAll('.column-content, #trash-drop-zone').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // Add highlight to current target
        if (columnContent) {
            columnContent.classList.add('drag-over');
            touchDropTarget = columnContent;
        } else if (trashZone) {
            trashZone.classList.add('drag-over');
            touchDropTarget = trashZone;
        } else {
            touchDropTarget = null;
        }
    }
}

function touchDragEnd(e) {
    // Clean up clone regardless
    if (touchClone) {
        touchClone.remove();
        touchClone = null;
    }
    
    // Process drop only if drag was active (not a scroll)
    if (touchDragActive && touchDraggedCard) {
        e.preventDefault();
        
        // Reset original card appearance
        touchDraggedCard.style.opacity = '1';
        touchDraggedCard.classList.remove('dragging');
        
        // Process drop if there's a valid target
        if (touchDropTarget) {
            const isTrashZone = touchDropTarget.id === 'trash-drop-zone';
            
            if (isTrashZone) {
                // Delete the card
                if (touchCurrentColumn) {
                    deleteCard(touchDraggedCard, touchCurrentColumn);
                }
            } else {
                // Move to new column
                const targetColumn = touchDropTarget.closest('.column');
                if (targetColumn) {
                    touchDropTarget.appendChild(touchDraggedCard);
                    saveState();
                    updateProgressBars();
                }
            }
        }
    }
    
    // Remove visual indicators
    document.querySelectorAll('.column-content, #trash-drop-zone').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-ready');
    });
    
    // Reset all touch state
    touchDraggedCard = null;
    touchDragActive = false;
    touchCurrentColumn = null;
    touchDropTarget = null;
    isScrolling = false;
    dragThresholdMet = false;
    touchStartX = 0;
    touchStartY = 0;
}

// ==================== Trash Functions ====================

function showTrashPage() {
    trashPage.classList.add('show');
    document.body.style.overflow = 'hidden';
    updateTrashPageDisplay();
}

function hideTrashPage() {
    trashPage.classList.remove('show');
    document.body.style.overflow = '';
}

function updateTrashPageDisplay() {
    if (!trashPageItems) return;
    
    if (trashItems.length === 0) {
        trashPageItems.innerHTML = '<div class="no-items-message">✨ No deleted items! Your trash is empty.</div>';
        return;
    }
    
    trashPageItems.innerHTML = '';
    trashItems.forEach((item, index) => {
        const title = item.title || item.html.match(/<h3>([^<]+)<\/h3>/)?.[1] || 'Unknown Task';
        const trashCard = document.createElement('div');
        trashCard.className = 'trash-item-card';
        trashCard.innerHTML = `
            <div class="trash-item-info">
                <h3>${escapeHtml(title)}</h3>
                <p>🗑️ Deleted from: <strong>${formatColumnName(item.column)}</strong> | 📅 ${item.timestamp}</p>
            </div>
            <div class="trash-item-actions">
                <select class="column-select" data-index="${index}">
                    <option value="">↙️ Restore to...</option>
                    <option value="todo">📝 To Do</option>
                    <option value="inprogress">⚡ In Progress</option>
                    <option value="done">✅ Done</option>
                </select>
                <button class="restore-btn" data-index="${index}">↻ Restore</button>
            </div>
        `;
        
        const select = trashCard.querySelector('.column-select');
        const restoreBtn = trashCard.querySelector('.restore-btn');
        
        restoreBtn.onclick = () => {
            const selectedColumn = select.value;
            if (!selectedColumn) {
                alert('Please select a column to restore to.');
                return;
            }
            restoreFromTrashToColumn(index, selectedColumn);
        };
        
        trashPageItems.appendChild(trashCard);
    });
}

function formatColumnName(column) {
    const names = {
        'todo': 'To Do',
        'inprogress': 'In Progress',
        'done': 'Done'
    };
    return names[column] || column;
}

function restoreFromTrashToColumn(index, column) {
    if (index < 0 || index >= trashItems.length) return;
    
    const item = trashItems[index];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.html;
    const cardElement = tempDiv.firstChild;
    
    if (cardElement) {
        let targetColumn;
        switch(column) {
            case 'todo': targetColumn = todoColumn; break;
            case 'inprogress': targetColumn = inprogressColumn; break;
            case 'done': targetColumn = doneColumn; break;
            default: targetColumn = todoColumn;
        }
        
        targetColumn.appendChild(cardElement);
        attachCardEvents(cardElement);
    }
    
    trashItems.splice(index, 1);
    saveState();
    updateProgressBars();
    updateTrashButton();
    updateTrashPageDisplay();
}

// ==================== Modal Functions ====================

function showAddCardPrompt(columnId) {
    currentColumn = columnId;
    modal.style.display = 'flex';
    cardInput.value = '';
    cardInput.focus();
}

function closeModal() {
    modal.style.display = 'none';
    currentColumn = null;
}

// ==================== Initialization ====================

function init() {
    // Make columns droppable for desktop
    makeColumnDroppable(todoColumn, 'todo');
    makeColumnDroppable(inprogressColumn, 'inprogress');
    makeColumnDroppable(doneColumn, 'done');
    makeTrashZoneDroppable();
    
    // Load saved data
    loadState();
    
    // Modal event listeners
    closeBtn.onclick = closeModal;
    if (cancelModalBtn) cancelModalBtn.onclick = closeModal;
    
    window.onclick = function(event) {
        if (event.target === modal) closeModal();
        if (event.target === trashPage) hideTrashPage();
    };
    
    saveCardBtn.onclick = function() {
        const cardText = cardInput.value.trim();
        if (cardText) {
            addCardToColumn(currentColumn, cardText);
            closeModal();
        } else {
            alert('Please enter a task title.');
        }
    };
    
    cardInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && cardInput.value.trim()) {
            addCardToColumn(currentColumn, cardInput.value.trim());
            closeModal();
        }
    });
    
    // Trash event listeners
    viewTrashBtn.onclick = showTrashPage;
    backFromTrashBtn.onclick = hideTrashPage;
    emptyTrashPageBtn.onclick = function() {
        if (confirm('⚠️ Are you sure you want to permanently delete ALL items in the trash? This action cannot be undone.')) {
            trashItems = [];
            saveState();
            updateTrashButton();
            updateTrashPageDisplay();
        }
    };
    
    console.log('KanFlow initialized - Drag & drop works on all devices with enhanced scrolling!');
}

// Start the app
window.onload = init;