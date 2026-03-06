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

import Cursor, { POS } from "./cursor";

export type Range = {
    start: POS;
    end: POS;
}

export default class Selection {
    cursor: Cursor;
    range: Range | null = null;

    constructor(cursor: Cursor) {
        this.cursor = cursor;
    }

    start() {
        this.range = {
            start: { ...this.cursor.pos },
            end: { ...this.cursor.pos }
        };
    }

    update() {
        if (this.range) {
            this.range.end = { ...this.cursor.pos };
        }
    }

    clear() { this.range = null; }

    getNormalizedRange(): Range | null {
        if (!this.range) return null;
        const start = this.range.start;
        const end = this.range.end;
        if (start.row > end.row || (start.row === end.row && start.col > end.col)) {
            return { start: end, end: start };
        }
        return { start, end };
    }
}
