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
import { AI } from 'langningchen';
import { showError, showSuccess } from '../../components/ToastMessage';
import { hideLoading, showLoading } from '../../components/Loading';
import { openSoftKeyboard } from '../../utils/softKeyboardUtils';

export type aiSettingsOptions = {};

const aiSettings = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<aiSettingsOptions>,
            apiKey: '',
            baseUrl: '',
            modelName: '',

            maxTokens: 0,
            temperature: 0,
            topP: 0,
            systemPrompt: '',

            userBalance: 0.0,
            availableModels: [] as string[],
        };
    },

    mounted() {
        try {
            AI.initialize();
            this.loadSettings();
            this.refreshBalance();
            this.refreshModels();
        } catch (e) {
            showError(e as string || 'AI 初始化失败');
        }
    },

    methods: {
        loadSettings() {
            try {
                const settings = AI.getSettings();
                this.apiKey = settings.apiKey;
                this.baseUrl = settings.baseUrl;
                this.modelName = settings.modelName;
                this.temperature = settings.temperature;
                this.topP = settings.topP;
                this.maxTokens = settings.maxTokens;
                this.systemPrompt = settings.systemPrompt;
            } catch (e) {
                showError(e as string || '加载设置失败');
            }
        },

        refreshBalance() {
            this.userBalance = 0.0;
            showLoading();
            AI.getUserBalance().then((balance) => {
                this.userBalance = balance;
            }).catch((e) => {
                showError(`获取余额失败: ${e}`);
            }).finally(() => {
                hideLoading();
            });
        },

        refreshModels() {
            this.availableModels = [];
            showLoading();
            AI.getModels().then((models) => {
                this.availableModels = models;
            }).catch((e) => {
                showError(`获取模型列表失败: ${e}`);
            }).finally(() => {
                hideLoading();
            });
        },

        selectModel(model: string) {
            this.modelName = model;
            this.$forceUpdate();
        },

        saveSettings() {
            try {
                AI.setSettings(this.apiKey, this.baseUrl,
                    this.modelName, this.maxTokens,
                    this.temperature, this.topP, this.systemPrompt,);
                showSuccess('设置已保存');
            } catch (e) {
                showError(e as string || '保存设置失败');
            }
        },

        editApiKey() {
            openSoftKeyboard(
                () => this.apiKey,
                (value) => { this.apiKey = value; this.$forceUpdate(); }
            );
        },

        editBaseUrl() {
            openSoftKeyboard(
                () => this.baseUrl,
                (value) => {
                    this.baseUrl = value.endsWith('/') ? value : value + "/";
                    this.$forceUpdate();
                },
                (value) => {
                    if (!value.startsWith("http")) { return '基础 URL 需要以 http 或 https 开头'; }
                }
            );
        },

        editMaxTokens() {
            openSoftKeyboard(
                () => this.maxTokens.toString(),
                (value) => { this.maxTokens = parseInt(value); this.$forceUpdate(); },
                (value) => {
                    const parsed = parseInt(value);
                    if (isNaN(parsed)) { return '请输入有效的数字'; }
                    if (parsed <= 0) { return 'Token 数量必须大于 0'; }
                }
            );
        },

        editTemperature() {
            openSoftKeyboard(
                () => this.temperature.toFixed(1),
                (value) => { this.temperature = parseFloat(value); this.$forceUpdate(); },
                (value) => {
                    const parsed = parseFloat(value);
                    if (isNaN(parsed)) { return '请输入有效的数字'; }
                    if (parsed < 0 || parsed > 1) { return '温度值必须在 0 到 1 之间'; }
                }
            );
        },

        editTopP() {
            openSoftKeyboard(
                () => this.topP.toFixed(1),
                (value) => { this.topP = parseFloat(value); this.$forceUpdate(); },
                (value) => {
                    const parsed = parseFloat(value);
                    if (isNaN(parsed)) { return '请输入有效的数字'; }
                    if (parsed < 0 || parsed > 1) { return 'Top-P 值必须在 0 到 1 之间'; }
                }
            );
        },

        editSystemPrompt() {
            openSoftKeyboard(
                () => this.systemPrompt,
                (value) => { this.systemPrompt = value; this.$forceUpdate(); }
            );
        }
    }
});

export default aiSettings;
