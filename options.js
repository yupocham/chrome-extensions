document.addEventListener('DOMContentLoaded', function () {
    const shortcutKeyInput      = document.getElementById('shortcut-key');
    const shortcutUrlInput      = document.getElementById('shortcut-url');
    const suggestionInput       = document.getElementById('suggestion-text');
    const noteInput             = document.getElementById('note');
    const addButton             = document.getElementById('add-button');
    const shortcutsList         = document.getElementById('shortcuts-list');
    const exportButton          = document.getElementById('export-button');
    const importButton          = document.getElementById('import-button');
    const importFile            = document.getElementById('import-file');
    const prevButton            = document.getElementById('prev-button');
    const nextButton            = document.getElementById('next-button');
    const pageInfo              = document.getElementById('page-info');

    const filterKeyInput        = document.getElementById('filter-key');
    const filterUrlInput        = document.getElementById('filter-url');
    const filterSuggestionInput = document.getElementById('filter-suggestion');
    const filterInputs          = [ filterKeyInput, filterUrlInput, filterSuggestionInput ];

    const editText           = '編集';
    const deleteText         = '削除';
    const saveText           = '保存';
    const cancelText         = '取消';

    const ITEMS_PER_PAGE  = 10;
    let currentPage       = 1;
    let shortcuts         = [];
    let filteredShortcuts = [];

    function filterShortcuts() {
        const filterKey        = filterKeyInput.value.toLowerCase();
        const filterUrl        = filterUrlInput.value.toLowerCase();
        const filterSuggestion = filterSuggestionInput.value.toLowerCase();
        
        filteredShortcuts = shortcuts.filter(([key, url, isEnabled, suggestionText]) => {
            return key.toLowerCase().includes(filterKey) && url.toLowerCase().includes(filterUrl) && suggestionText.toLowerCase().includes(filterSuggestion);
        });
        renderShortcutsPage(currentPage);
    }

    function renderShortcutsPage(page) {
        const startIndex    = (page - 1) * ITEMS_PER_PAGE;
        const endIndex      = startIndex + ITEMS_PER_PAGE;
        const pageShortcuts = filteredShortcuts.slice(startIndex, endIndex);

        shortcutsList.innerHTML = '';
        pageShortcuts.forEach(([key, url, isEnabled, suggestionText, note], index) => {
            const row            = document.createElement('tr');
            row.dataset.index    = startIndex + index;

            const checkboxCell   = document.createElement('td');
            const checkbox       = document.createElement('input');

            checkboxCell.className = 'isEnabled-cell';
            checkbox.type          = 'checkbox';
            checkbox.checked       = isEnabled;
            checkbox.addEventListener('change', () => {
                shortcuts[row.dataset.index][2] = checkbox.checked;
                saveShortcuts();
            });
            checkboxCell.appendChild(checkbox);
            row.appendChild(checkboxCell);

            const keyCell         = document.createElement('td');
            keyCell.className     = 'key-cell';
            keyCell.textContent   = key;
            row.appendChild(keyCell);

            const urlCell         = document.createElement('td');
            urlCell.className     = 'url-cell';
            urlCell.textContent   = url;
            row.appendChild(urlCell);

            const suggestionCell  = document.createElement('td');
            suggestionCell.className = 'suggestion-cell';
            suggestionCell.textContent = suggestionText || '';
            row.appendChild(suggestionCell);

            const noteCell        = document.createElement('td');
            noteCell.className    = 'note-cell';
            noteCell.textContent  = note || '';
            row.appendChild(noteCell);

            const actionCell      = document.createElement('td');
            actionCell.className  = 'action-cell';

            const editButton      = document.createElement('button');
            editButton.className  = 'edit-button';
            editButton.textContent = editText;
            editButton.dataset.key = key;
            editButton.dataset.url = url;
            editButton.dataset.suggestionText = suggestionText || '';
            editButton.dataset.note = note || '';
            actionCell.appendChild(editButton);

            const deleteButton    = document.createElement('button');
            deleteButton.className = 'delete';
            deleteButton.textContent = deleteText;
            deleteButton.dataset.key = key;
            actionCell.appendChild(deleteButton);

            row.appendChild(actionCell);
            shortcutsList.appendChild(row);
        });

        pageInfo.textContent = `ページ ${currentPage} / ${Math.ceil(filteredShortcuts.length / ITEMS_PER_PAGE)}`;
        prevButton.disabled  = currentPage === 1;
        nextButton.disabled  = endIndex >= filteredShortcuts.length;
    }

    function saveShortcuts() {
        const shortcutsObj = {};
        shortcuts.forEach(([key, url, isEnabled, suggestionText, note]) => {
            shortcutsObj[key] = { url, isEnabled, suggestionText, note };
        });
        chrome.storage.local.set({ shortcuts: shortcutsObj }, () => {
            filterShortcuts();
        });
    }

    function loadShortcuts() {
        chrome.storage.local.get('shortcuts', (result) => {
            shortcuts = Object.entries(result.shortcuts || {}).map(([key, data]) => [
                key,
                data.url,
                data.isEnabled,
                data.suggestionText || '',
                data.note || ''
            ]);
            filterShortcuts();
        });
    }

    function deleteRow( event ) {
        const key = event.target.dataset.key;

        if ( confirm('削除してもよろしいですか？「OK」を押すと、元に戻すことはできません。') ) {
            chrome.storage.local.get('shortcuts', (result) => {
                const shortcutsObj = result.shortcuts || {};
                delete shortcutsObj[key];
                chrome.storage.local.set({ shortcuts: shortcutsObj }, () => {
                    if (currentPage > Math.ceil(filteredShortcuts.length / ITEMS_PER_PAGE)) {
                        currentPage--;
                    }
                    loadShortcuts();
                });
            });
        }
    }

    function hasEdittingRow() {
        if ( getEdittingRow() !== null ) {
            return true;
        }
        return false;
    }

    function getEdittingRow() {
        return document.querySelector('[data-status="edit"]');
    }

    function undoEdittinRow( row ) {
        const keyCell        = row.children[1];
        const urlCell        = row.children[2];
        const suggestionCell = row.children[3];
        const noteCell       = row.children[4];
        const saveButton     = row.children[5].children[0];
        const cancelButton   = row.children[5].children[1];

        keyCell.removeChild( keyCell.children[0] );
        keyCell.innerHTML = row.dataset.keyOld;

        urlCell.removeChild( urlCell.children[0] );
        urlCell.innerHTML = row.dataset.urlOld;

        suggestionCell.removeChild( suggestionCell.children[0] );
        suggestionCell.innerHTML = row.dataset.suggestionTextOld;

        noteCell.removeChild( noteCell.children[0] );
        noteCell.innerHTML = row.dataset.noteOld;

        saveButton.innerHTML   = editText;
        cancelButton.innerHTML = deleteText;

        saveButton.classList.remove('save');
        cancelButton.classList.remove('cancel');

        delete row.dataset.status;
        delete row.dataset.keyOld;
        delete row.dataset.urlOld;
        delete row.dataset.suggestionTextOld;
        delete row.dataset.noteOld;
    }

    function renderEditRow( event ) {
        const row            = event.target.closest('tr');
        const key            = event.target.dataset.key;
        const url            = event.target.dataset.url;
        const suggestionText = event.target.dataset.suggestionText;
        const note           = event.target.dataset.note;

        row.dataset.status            = 'edit';
        row.dataset.keyOld            = key;
        row.dataset.urlOld            = url;
        row.dataset.suggestionTextOld = suggestionText;
        row.dataset.noteOld           = note;

        const keyInput = document.createElement('input');
        keyInput.type  = 'text';
        keyInput.value = key;

        const urlInput = document.createElement('input');
        urlInput.type  = 'text';
        urlInput.value = url;

        const suggestionInput = document.createElement('input');
        suggestionInput.type  = 'text';
        suggestionInput.value = suggestionText;

        const noteInput = document.createElement('input');
        noteInput.type  = 'text';
        noteInput.value = note;

        row.children[1].innerHTML = '';
        row.children[1].appendChild(keyInput);

        row.children[2].innerHTML = '';
        row.children[2].appendChild(urlInput);

        row.children[3].innerHTML = '';
        row.children[3].appendChild(suggestionInput);

        row.children[4].innerHTML = '';
        row.children[4].appendChild(noteInput);

        event.target.textContent = saveText;
        event.target.classList.add('save');

        event.target.nextSibling.textContent = cancelText;
        event.target.nextSibling.classList.add('cancel');
    }

    function renderSavedRow( event ) {
        const row = event.target.closest('tr');
        const key = event.target.dataset.key;

        const newKey = row.children[1].querySelector('input').value.trim();
        const newUrl = row.children[2].querySelector('input').value.trim();
        const newSuggestionText = row.children[3].querySelector('input').value.trim();
        const newNote = row.children[4].querySelector('input').value.trim();

        if ( newKey && newUrl ) {
            chrome.storage.local.get( 'shortcuts', ( result ) => {
                const shortcutsObj = result.shortcuts || {};

                if ( newKey !== key ) {
                    delete shortcutsObj[ key ];
                }
                shortcutsObj[ newKey ] = {
                    url: newUrl,
                    isEnabled: shortcuts[ row.dataset.index ][2],
                    suggestionText: newSuggestionText,
                    note: newNote
                };

                shortcuts[ parseInt( row.dataset.index ) ] = [
                    newKey, newUrl, shortcuts[ row.dataset.index ][2], newSuggestionText, newNote
                ];
                chrome.storage.local.set( { shortcuts: shortcutsObj }, () => {
                    filterShortcuts();
                });
            });
        }
    }

    addButton.addEventListener( 'click', () => {
        const key            = shortcutKeyInput.value.trim();
        const url            = shortcutUrlInput.value.trim();
        const suggestionText = suggestionInput.value.trim();
        const note           = noteInput.value.trim();
        if ( key && url ) {
            chrome.storage.local.get( 'shortcuts', ( result ) => {
                const shortcuts   = result.shortcuts || {};
                shortcuts[ key ]  = { url, isEnabled: true, suggestionText, note };
                chrome.storage.local.set( { shortcuts }, () => {
                    shortcutKeyInput.value = '';
                    shortcutUrlInput.value = '';
                    suggestionInput.value  = '';
                    noteInput.value        = '';
                    loadShortcuts();
                });
            });
        } else {
            window.alert('ショートカットとURLは必須項目です。');
        }
    });

    shortcutsList.addEventListener( 'click', ( event ) => {
        if ( event.target.textContent === deleteText ) {
            if ( hasEdittingRow() ) {
                undoEdittinRow( getEdittingRow() );
            }
            deleteRow( event );
        } else if ( event.target.textContent === editText ) {
            if ( hasEdittingRow() ) {
                undoEdittinRow( getEdittingRow() );
            }
            renderEditRow( event );
        } else if ( event.target.textContent === saveText ) {
            renderSavedRow( event );
        } else if ( event.target.textContent === cancelText ) {
            renderShortcutsPage( currentPage );
        }
    });

    prevButton.addEventListener( 'click', () => {
        if ( currentPage > 1 ) {
            currentPage--;
            renderShortcutsPage( currentPage );
        }
    });

    nextButton.addEventListener( 'click', () => {
        if ( currentPage * ITEMS_PER_PAGE < filteredShortcuts.length ) {
            currentPage++;
            renderShortcutsPage( currentPage );
        }
    });

    exportButton.addEventListener( 'click', () => {
        chrome.storage.local.get( 'shortcuts', ( result ) => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent( JSON.stringify( result.shortcuts, null, 2 ) );
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute( "href", dataStr );
            downloadAnchorNode.setAttribute( "download", "shortcuts.json" );
            document.body.appendChild( downloadAnchorNode );
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });
    });

    importButton.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const shortcutsObj = JSON.parse(e.target.result);
                chrome.storage.local.set({ shortcuts: shortcutsObj }, () => {
                    currentPage = 1;
                    loadShortcuts();
                });
            };
            reader.readAsText(file);
        }
    });

    filterInputs.forEach( element => {
        element.addEventListener( 'input', () => {
            currentPage = 1;
            filterShortcuts();
        });
    });

    loadShortcuts();
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    chrome.storage.local.get('shortcuts', (result) => {
        const shortcuts = Object.entries(result.shortcuts || {})
            .filter(([key, data]) => key.includes(text) && data.isEnabled)
            .map(([key, data]) => ({
                content: key,
                description: data.suggestionText || key
            }));
        suggest(shortcuts);
    });
});
