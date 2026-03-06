<!--
    Copyright (C) 2025 Langning Chen

    This file is part of miniapp.

    miniapp is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    miniapp is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with miniapp.  If not, see <https://www.gnu.org/licenses/>.
-->

<template>
    <div v-if="isVisible" :class="'toast-message toast-' + type" :style="animationStyle" @click="onToastClick">
        <text class="toast-text">{{ message }}</text>
    </div>
</template>

<style lang="less" scoped>
.toast-message {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 560px;
    min-height: 40px;
    max-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    transition: all 0.3s ease;
    padding: 8px 16px;
    box-sizing: border-box;
}

.toast-error {
    background-color: #dc3545;
}

.toast-warning {
    background-color: #ffc107;
}

.toast-success {
    background-color: #28a745;
}

.toast-info {
    background-color: #17a2b8;
}

.toast-text {
    color: #ffffff;
    font-size: 18px;
    text-align: center;
    line-height: 24px;
    flex: 1;
}

.toast-enter {
    transform: translateY(100%);
    opacity: 0;
}

.toast-show {
    transform: translateY(0%);
    opacity: 1;
}

.toast-exit {
    transform: translateY(100%);
    opacity: 0;
}
</style>

<script>
import ToastMessageComponent from './ToastMessage';
export default ToastMessageComponent;
</script>
