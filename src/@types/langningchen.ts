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

export enum ROLE {
    ROLE_USER = 0,
    ROLE_ASSISTANT = 1,
    ROLE_SYSTEM = 2
}

export enum STOP_REASON {
    STOP_REASON_DONE = 0,
    STOP_REASON_STOP = 1,
    STOP_REASON_LENGTH = 2,
    STOP_REASON_ERROR = 3,
    STOP_REASON_CONTENT_FILTER = 4,
    STOP_REASON_USER_STOPPED = 5,
    STOP_REASON_NONE = 6
}

export interface ConversationNode {
    id: string;
    role: ROLE;
    content: string;
    parentId: string;
    childIds: string[];
    timestamp: string;
    stopReason: STOP_REASON;
}

export interface ConversationInfo {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}


export interface SettingsResponse {
    apiKey: string;
    baseUrl: string;
    modelName: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    systemPrompt: string;
}


export type Pinyin = string[]
export interface Candidate {
    pinyin: Pinyin;
    hanZi: string;
    freq: number;
}
