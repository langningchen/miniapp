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

import { defineComponent } from 'vue';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

let toastInstance: any = null;

function showToast(message: string, type: ToastType = 'error', duration: number = 3000) {
    if (toastInstance) {
        toastInstance.show(message, type, duration);
    }
}

export function showError(message: string, duration: number = 3000) {
    showToast(message, 'error', duration);
}

export function showWarning(message: string, duration: number = 3000) {
    showToast(message, 'warning', duration);
}

export function showSuccess(message: string, duration: number = 3000) {
    showToast(message, 'success', duration);
}

export function showInfo(message: string, duration: number = 3000) {
    showToast(message, 'info', duration);
}

const ToastMessage = defineComponent({
    data() {
        return {
            isVisible: false,
            message: '',
            type: 'error' as ToastType,
            animationState: 'hidden', // 'hidden', 'enter', 'show', 'exit'
            timeoutId: null as number | null,
        };
    },

    computed: {
        animationStyle() {
            switch (this.animationState) {
                case 'enter':
                    return 'transform: translateY(100%); opacity: 0;';
                case 'show':
                    return 'transform: translateY(0%); opacity: 1;';
                case 'exit':
                    return 'transform: translateY(100%); opacity: 0;';
                default:
                    return 'transform: translateY(100%); opacity: 0;';
            }
        }
    },

    mounted() {
        toastInstance = this;
    },

    destroyed() {
        if (toastInstance === this) {
            toastInstance = null;
        }
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
    },

    methods: {
        show(message: string, type: ToastType = 'error', duration: number = 3000) {
            if (this.isVisible) {
                this.hide(() => {
                    this.showNew(message, type, duration);
                });
            } else {
                this.showNew(message, type, duration);
            }
        },

        showNew(message: string, type: ToastType, duration: number) {
            this.message = message;
            this.type = type;
            this.isVisible = true;
            this.animationState = 'enter';

            this.$forceUpdate();

            setTimeout(() => {
                this.animationState = 'show';
                this.$forceUpdate();
            }, 50);

            if (this.timeoutId !== null) {
                clearTimeout(this.timeoutId);
            }

            this.timeoutId = setTimeout(() => {
                this.hide();
            }, duration) as any;
        },

        hide(callback?: () => void) {
            this.animationState = 'exit';
            this.$forceUpdate();

            setTimeout(() => {
                this.isVisible = false;
                this.animationState = 'hidden';
                this.$forceUpdate();
                if (callback) {
                    callback();
                }
            }, 300);
        },

        onToastClick() {
            if (this.timeoutId !== null) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
            this.hide();
        }
    }
});

export default ToastMessage;
