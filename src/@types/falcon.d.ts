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

type HttpRequestMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';
type HttpResponse = {
    statusCode: number,
    headers: { [key: string]: string },
    data: any,
    statusText?: string,
    error?: string
}

type Falcon = {
    on<T>(eventName: string, callback: FalconCallback<T>): void,
    off<T>(eventName: string, callback?: FalconCallback<T>): void,
    trigger<T>(eventName: string, data: T): void,
    navTo<T>(target: String, options: T): void,
    trigger<T>(eventName: string, data: T): void,
    jsapi: {
        storage: {
            setStorage(params: { key: string; data: string }): Promise<any>;
            getStorage(params: { key: string }): Promise<{ data: string }>;
            getStorageInfo(params: {}): Promise<{ keys: string[]; currentSize: number; limitSize: number; }>;
        },
        http: {
            request(params: {
                url: string,
                method?: HttpRequestMethod,
                headers?: { [key: string]: string },
                data?: any,
                timeout?: number,
            }): Promise<HttpResponse>;
        }
    },
    closeApp: () => void,
    closePageByName: (pageName: string) => void,
    closePageById: (pageId: string) => void,
    $app: {
        finish: () => void,
    }
};

type FalconEvent<T> = {
    type: string,
    timestamp: string,
    data: T
};

type FalconCallback<T> = (data: FalconEvent<T>) => void;

declare const $falcon: Falcon;

type FalconPage<T> = {
    $falcon: Falcon,
    $root: Object,
    $pageName: string,
    $pageId: string,
    loadOptions: T,
    newOptions: T,
    setRootComponent: (component: any) => void,
    finish: () => void,
    $npage: {
        setSupportBack: (support: boolean) => void
        on: (eventName: string, callback: () => void) => void
        off: (eventName: string, callback: () => void) => void
    }
    on: (eventName: string, callback: () => void) => void
    off: (eventName: string, callback: () => void) => void
}
