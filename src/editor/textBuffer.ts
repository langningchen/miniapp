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

import { POS } from "./cursor";
import { Range } from "./selection";

export type TextData = string[];

export default class TextBuffer {
    data: TextData;

    constructor(initialData = ['']) {
        this.data = initialData;
    }

    insertText(pos: POS, text: string): POS {
        const { row, col } = pos;
        const linesToInsert = text.split('\n');
        const currentLine = this.data[row];
        if (linesToInsert.length === 1) {
            this.data[row] = currentLine.slice(0, col) + text + currentLine.slice(col);
            return { row, col: col + text.length };
        }
        const firstPart = currentLine.slice(0, col);
        const lastPart = currentLine.slice(col);
        this.data[row] = firstPart + linesToInsert[0];
        for (let i = 1; i < linesToInsert.length - 1; i++) {
            this.data.splice(row + i, 0, linesToInsert[i]);
        }
        this.data.splice(row + linesToInsert.length - 1, 0, linesToInsert[linesToInsert.length - 1] + lastPart);
        return {
            row: row + linesToInsert.length - 1,
            col: linesToInsert[linesToInsert.length - 1].length
        };
    }

    deleteText(range: Range) {
        if (range.start.row === range.end.row) {
            this.data[range.start.row] = this.data[range.start.row].slice(0, range.start.col) + this.data[range.start.row].slice(range.end.col);
        } else {
            this.data[range.start.row] = this.data[range.start.row].slice(0, range.start.col) + this.data[range.end.row].slice(range.end.col);
            this.data.splice(range.start.row + 1, range.end.row - range.start.row);
        }
        if (this.data.length === 0) { this.data.push(''); }
    }

    backspace(pos: POS): POS {
        const { row, col } = pos;
        if (col > 0) {
            this.data[row] = this.data[row].slice(0, col - 1) + this.data[row].slice(col);
            return { row, col: col - 1 };
        } else if (row > 0) {
            const newCol = this.data[row - 1].length;
            this.data[row - 1] += this.data[row];
            this.data.splice(row, 1);
            return { row: row - 1, col: newCol };
        }
        return { row, col };
    }

    deleteForward(pos: POS) {
        const { row, col } = pos;
        if (col < this.data[row].length) {
            this.data[row] = this.data[row].slice(0, col) + this.data[row].slice(col + 1);
        } else if (row < this.data.length - 1) {
            this.data[row] += this.data[row + 1];
            this.data.splice(row + 1, 1);
        }
    }

    getText(range: Range) {
        let selectedText = [];
        if (range.start.row === range.end.row) {
            selectedText.push(this.data[range.start.row].slice(range.start.col, range.end.col));
        } else {
            selectedText.push(this.data[range.start.row].slice(range.start.col));
            for (let i = range.start.row + 1; i < range.end.row; i++) {
                selectedText.push(this.data[i]);
            }
            selectedText.push(this.data[range.end.row].slice(0, range.end.col));
        }
        return selectedText.join('\n');
    }
}
