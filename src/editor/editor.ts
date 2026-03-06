// Copyright (C) 2025 Langning Chen
// 
// This file is part of miniapp.
// 
// miniapp is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// miniapp is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

import Cursor, { POS } from './cursor';
import Selection from './selection';
import TextBuffer from './textBuffer';
import History from './history';
import { getPositionWidth, findCharPositionByWidth } from '../utils/charUtils';
import { ScanInput } from 'langningchen';

export default class Editor {
    insertMode: boolean = true;
    controlPressed: boolean = false;
    shiftPressed: boolean = false;
    capsLock: boolean = false;
    scanEnabled: boolean = false;
    clipboard: string = '';
    maxLines: number = 0;
    scrollOffset: number = 0;
    horizontalScrollOffset: number = 0;
    maxColumns: number = 0;
    cursor: Cursor;
    selection: Selection;
    textBuffer: TextBuffer;
    history: History;
    keyMap: Map<string, Function> = new Map();
    shiftedChars = new Map<string, string>([
        ['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'],
        ['-', '_'], ['=', '+'], ['[', '{'], [']', '}'], ['\\', '|'], [';', ':'], ["'", '"'], [',', '<'], ['.', '>'], ['/', '?'],
    ]);

    constructor(maxColumns: number, maxLines: number) {
        this.maxLines = maxLines;
        this.maxColumns = maxColumns;

        this.cursor = new Cursor();
        this.selection = new Selection(this.cursor);
        this.textBuffer = new TextBuffer();
        this.history = new History(this.textBuffer.data, this.cursor.pos);

        this.keyMap.set('Enter', () => {
            if (this.controlPressed) {
                const currentRow = this.cursor.pos.row;
                const newPos = this.textBuffer.insertText({ row: currentRow, col: this.textBuffer.data[currentRow].length }, '\n');
                this.cursor.move({ row: newPos.row, col: 0 }, this.textBuffer.data);
                this.history.saveState(this.textBuffer.data, this.cursor.pos);
            } else {
                this.handleInput('\n');
            }
            this.controlPressed = this.shiftPressed = false;
        });
        this.keyMap.set('Tab', () => { this.handleInput('    '); this.controlPressed = this.shiftPressed = false; });
        this.keyMap.set('Backspace', () => {
            const range = this.selection.getNormalizedRange();
            if (this.controlPressed && !range) {
                const originalPos = this.cursor.pos;
                this.cursor.moveWordLeft(this.textBuffer.data);
                const wordStart = { row: this.cursor.pos.row, col: this.cursor.pos.col };
                this.textBuffer.deleteText({ start: wordStart, end: originalPos });
                this.cursor.move(wordStart, this.textBuffer.data);
            } else if (range) {
                this.textBuffer.deleteText(range);
                this.cursor.move(range.start, this.textBuffer.data);
                this.selection.clear();
            } else {
                const newPos = this.textBuffer.backspace(this.cursor.pos);
                this.cursor.move(newPos, this.textBuffer.data);
            }
            this.history.saveState(this.textBuffer.data, this.cursor.pos);
            this.controlPressed = this.shiftPressed = false;
        });
        this.keyMap.set('Delete', () => {
            const range = this.selection.getNormalizedRange();
            if (range) {
                this.textBuffer.deleteText(range);
                this.cursor.move(range.start, this.textBuffer.data);
                this.selection.clear();
            } else {
                this.textBuffer.deleteForward(this.cursor.pos);
            }
            this.history.saveState(this.textBuffer.data, this.cursor.pos);
            this.controlPressed = this.shiftPressed = false;
        });
        this.keyMap.set('Insert', () => { this.insertMode = !this.insertMode; });
        this.keyMap.set('Home', () => {
            if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                this.cursor.moveToHome(this.controlPressed, this.textBuffer.data);
                this.selection.update();
            } else {
                this.cursor.moveToHome(this.controlPressed, this.textBuffer.data);
                this.selection.clear();
            }
            this.ensureCursorVisible();
            this.controlPressed = this.shiftPressed = false;
        });
        this.keyMap.set('End', () => {
            if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                this.cursor.moveToEnd(this.textBuffer.data, this.controlPressed);
                this.selection.update();
            } else {
                this.cursor.moveToEnd(this.textBuffer.data, this.controlPressed);
                this.selection.clear();
            }
            this.ensureCursorVisible();
            this.controlPressed = this.shiftPressed = false;
        });
        this.keyMap.set('ArrowLeft', () => {
            if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                if (this.controlPressed) {
                    this.cursor.moveWordLeft(this.textBuffer.data);
                } else {
                    this.cursor.moveLeft(this.textBuffer.data);
                }
                this.selection.update();
            } else {
                const range = this.selection.getNormalizedRange();
                if (range) {
                    this.cursor.move(range.start, this.textBuffer.data);
                    this.selection.clear();
                } else {
                    if (this.controlPressed) {
                        this.cursor.moveWordLeft(this.textBuffer.data);
                    } else {
                        this.cursor.moveLeft(this.textBuffer.data);
                    }
                }
            }
            this.ensureCursorVisible();
        });
        this.keyMap.set('ArrowRight', () => {
            if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                if (this.controlPressed) {
                    this.cursor.moveWordRight(this.textBuffer.data);
                } else {
                    this.cursor.moveRight(this.textBuffer.data);
                }
                this.selection.update();
            } else {
                const range = this.selection.getNormalizedRange();
                if (range) {
                    this.cursor.move(range.end, this.textBuffer.data);
                    this.selection.clear();
                } else {
                    if (this.controlPressed) {
                        this.cursor.moveWordRight(this.textBuffer.data);
                    } else {
                        this.cursor.moveRight(this.textBuffer.data);
                    }
                }
            }
            this.ensureCursorVisible();
        });
        this.keyMap.set('ArrowUp', () => {
            if (this.controlPressed) {
                this.scrollOffset = Math.max(0, this.scrollOffset - 1);
            } else if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                this.cursor.moveUp(this.textBuffer.data);
                this.selection.update();
                this.ensureCursorVisible();
            } else {
                this.cursor.moveUp(this.textBuffer.data);
                this.selection.clear();
                this.ensureCursorVisible();
            }
            this.controlPressed = false;
        });
        this.keyMap.set('ArrowDown', () => {
            if (this.controlPressed) {
                const maxScrollOffset = Math.max(0, this.textBuffer.data.length - this.maxLines);
                this.scrollOffset = Math.min(maxScrollOffset, this.scrollOffset + 1);
            } else if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                this.cursor.moveDown(this.textBuffer.data);
                this.selection.update();
                this.ensureCursorVisible();
            } else {
                this.cursor.moveDown(this.textBuffer.data);
                this.selection.clear();
                this.ensureCursorVisible();
            }
            this.controlPressed = false;
        });
        this.keyMap.set('PageUp', () => {
            if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                this.cursor.movePageUp(this.textBuffer.data);
                this.selection.update();
            } else {
                this.cursor.movePageUp(this.textBuffer.data);
                this.selection.clear();
            }
            this.ensureCursorVisible();
            this.controlPressed = this.shiftPressed = false;
        });
        this.keyMap.set('PageDown', () => {
            if (this.shiftPressed) {
                if (!this.selection.range) { this.selection.start(); }
                this.cursor.movePageDown(this.textBuffer.data);
                this.selection.update();
            } else {
                this.cursor.movePageDown(this.textBuffer.data);
                this.selection.clear();
            }
            this.ensureCursorVisible();
            this.controlPressed = this.shiftPressed = false;
        });
        this.keyMap.set('Control', () => { this.controlPressed = !this.controlPressed; });
        this.keyMap.set('Shift', () => {
            this.shiftPressed = !this.shiftPressed;
            if (!this.shiftPressed && this.selection.range) {
                const range = this.selection.getNormalizedRange();
                if (range && range.start === range.end) {
                    this.selection.clear();
                }
            }
        });
        this.keyMap.set('CapsLock', () => { this.capsLock = !this.capsLock; });
        this.keyMap.set('Scan', () => {
            this.scanEnabled = !this.scanEnabled;
            if (this.scanEnabled) { ScanInput.initialize(); }
            else { ScanInput.deinitialize(); }
        });
        this.keyMap.set('a', () => {
            if (this.controlPressed) {
                this.selection.clear();
                this.cursor.move({ row: 0, col: 0 }, this.textBuffer.data);
                this.selection.start();
                const lastRow = this.textBuffer.data.length - 1;
                const lastCol = this.textBuffer.data[lastRow].length;
                this.cursor.move({ row: lastRow, col: lastCol }, this.textBuffer.data);
                this.selection.update();
            } else {
                this.defaultInput('a');
            }
        });
        this.keyMap.set('c', () => {
            if (this.controlPressed) {
                const range = this.selection.getNormalizedRange();
                if (range) {
                    this.clipboard = this.textBuffer.getText(range);
                } else {
                    this.clipboard = this.textBuffer.data[this.cursor.pos.row];
                }
            } else {
                this.defaultInput('c');
            }
        });
        this.keyMap.set('x', () => {
            if (this.controlPressed) {
                const range = this.selection.getNormalizedRange();
                if (range) {
                    this.clipboard = this.textBuffer.getText(range);
                    this.textBuffer.deleteText(range);
                    this.cursor.move(range.start, this.textBuffer.data);
                    this.selection.clear();
                    this.history.saveState(this.textBuffer.data, this.cursor.pos);
                } else {
                    this.clipboard = this.textBuffer.data[this.cursor.pos.row];
                    if (this.textBuffer.data.length > 1) {
                        this.textBuffer.data.splice(this.cursor.pos.row, 1);
                        if (this.cursor.pos.row >= this.textBuffer.data.length) {
                            this.cursor.pos.row = this.textBuffer.data.length - 1;
                        }
                        this.cursor.pos.col = 0;
                    } else {
                        this.textBuffer.data[0] = '';
                        this.cursor.pos.col = 0;
                    }
                    this.cursor.preferredCol = this.cursor.pos.col;
                    this.history.saveState(this.textBuffer.data, this.cursor.pos);
                }
            } else {
                this.defaultInput('x');
            }
        });
        this.keyMap.set('v', () => {
            if (this.controlPressed) {
                this.handleInput(this.clipboard);
            } else {
                this.defaultInput('v');
            }
        });
        this.keyMap.set('z', () => {
            if (this.controlPressed) {
                const prevState = this.history.undo();
                if (prevState) {
                    this.textBuffer.data = prevState.data.map(line => line);
                    this.cursor.move(prevState.pos, this.textBuffer.data);
                    this.selection.clear();
                }
            } else {
                this.defaultInput('z');
            }
        });
        this.keyMap.set('y', () => {
            if (this.controlPressed) {
                const nextState = this.history.redo();
                if (nextState) {
                    this.textBuffer.data = nextState.data.map(line => line);
                    this.cursor.move(nextState.pos, this.textBuffer.data);
                    this.selection.clear();
                }
            } else {
                this.defaultInput('y');
            }
        });

        ScanInput.on('scan_input', (data: string) => {
            this.handleInput(data);
        });
    }

    defaultInput(key: string) {
        if (/[a-zA-Z]/.test(key)) {
            if (this.controlPressed) { return; }
            if (this.shiftPressed && this.capsLock) {
                key = key.toLowerCase();
            } else if (this.shiftPressed || this.capsLock) {
                key = key.toUpperCase();
            } else {
                key = key.toLowerCase();
            }
        } else if (this.shiftPressed) {
            key = this.shiftedChars.get(key) || key;
        }
        this.handleInput(key);
        this.controlPressed = false;
    }

    handleInput(char: string) {
        let newCursorPos: POS;
        const range = this.selection.getNormalizedRange();
        if (range) {
            newCursorPos = range.start;
            this.textBuffer.deleteText(range);
            this.cursor.move(range.start, this.textBuffer.data);
            this.selection.clear();
        }
        if (this.insertMode || char === '\n') {
            newCursorPos = this.textBuffer.insertText(this.cursor.pos, char);
        } else {
            const charLength = char.length;
            const currentLineLength = this.textBuffer.data[this.cursor.pos.row].length;
            const charsToOverwrite = Math.min(charLength, currentLineLength - this.cursor.pos.col);
            if (charsToOverwrite > 0) {
                this.textBuffer.deleteText({
                    start: this.cursor.pos,
                    end: {
                        row: this.cursor.pos.row,
                        col: this.cursor.pos.col + charsToOverwrite
                    }
                });
            }
            newCursorPos = this.textBuffer.insertText(this.cursor.pos, char);
        }
        this.cursor.move(newCursorPos, this.textBuffer.data);
        this.history.saveState(this.textBuffer.data, this.cursor.pos);
        this.ensureCursorVisible();
        this.shiftPressed = false;
    }

    pressKey(key: string) {
        const handler = this.keyMap.get(key);
        if (handler) {
            handler();
        } else if (key.length === 1) {
            this.defaultInput(key);
        }
        if (key.length === 1) { this.controlPressed = false; }
    }

    ensureCursorVisible() {
        const cursorRow = this.cursor.pos.row;

        if (cursorRow < this.scrollOffset) {
            this.scrollOffset = cursorRow;
        }
        if (cursorRow >= this.scrollOffset + this.maxLines) {
            this.scrollOffset = cursorRow - this.maxLines + 1;
        }

        const currentLine = this.textBuffer.data[cursorRow];
        const cursorPixelX = this.cursor.preferredPixelX;
        const maxVisibleWidth = this.maxColumns * 8;

        const scrollPixelX = getPositionWidth(currentLine, this.horizontalScrollOffset);

        if (cursorPixelX < scrollPixelX) {
            this.horizontalScrollOffset = findCharPositionByWidth(currentLine, cursorPixelX);
        }
        else if (cursorPixelX >= scrollPixelX + maxVisibleWidth) {
            const targetPixelX = cursorPixelX - maxVisibleWidth + 16;
            this.horizontalScrollOffset = findCharPositionByWidth(currentLine, Math.max(0, targetPixelX));
        }
    }

    getVisibleLines() {
        const visibleLines = [];
        const startRow = this.scrollOffset;
        const endRow = Math.min(startRow + this.maxLines, this.textBuffer.data.length);

        for (let logicalRow = startRow; logicalRow < endRow; logicalRow++) {
            const line = this.textBuffer.data[logicalRow];
            const displayRow = logicalRow - startRow;

            visibleLines.push({
                logicalRow,
                displayRow,
                startCharIndex: this.horizontalScrollOffset,
                endCharIndex: this.horizontalScrollOffset + this.maxColumns,
                line: line
            });
        }

        return visibleLines;
    }

    getShiftedChar(key: string) { return this.shiftedChars.get(key) || key; }
}
