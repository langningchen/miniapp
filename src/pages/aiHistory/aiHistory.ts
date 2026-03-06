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
import { formatTime } from '../../utils/timeUtils';

export type aiHistoryOptions = {};

const aiHistory = defineComponent({
    data() {
        return {
            $page: {} as FalconPage<aiHistoryOptions>,
            conversationList: [] as any[],
            currentConversationId: '',

            searchKeyword: '',
        };
    },

    async mounted() {
        try {
            AI.initialize()
            await this.loadConversationList();
        } catch (e) {
            showError(e as string || 'AI 初始化失败');
        }
    },

    computed: {
        filteredConversations(): any[] {
            let filtered = [...this.conversationList];
            if (this.searchKeyword) {
                const keyword = this.searchKeyword.toLowerCase();
                filtered = filtered.filter(conv => conv.title.toLowerCase().includes(keyword));
            }
            filtered.sort((a, b) => {
                return b.updatedAt - a.updatedAt;
            });
            return filtered;
        }
    },

    methods: {
        async loadConversationList() {
            showLoading();
            AI.getConversationList().then((list) => {
                this.conversationList = list;
                this.currentConversationId = AI.getCurrentConversationId();
            }).catch((e) => {
                showError(e as string || '加载对话列表失败');
            }).finally(() => {
                hideLoading();
            });
        },

        async createConversation() {
            AI.createConversation(`新对话 ${Date.now()}`).then(() => {
                return this.loadConversationList();
            }).then(() => {
                this.$page.finish();
            }).catch((e) => {
                showError(e as string || '创建对话失败');
            });
        },

        async loadConversation(conversationId: string) {
            AI.loadConversation(conversationId).then(() => {
                this.currentConversationId = conversationId;
                this.$page.finish();
            }).catch((e) => {
                showError(e as string || '加载对话失败');
            });
        },

        async deleteConversation(conversationId: string) {
            AI.deleteConversation(conversationId).then(() => {
                return this.loadConversationList();
            }).then(() => {
                showSuccess('对话删除成功');
                if (conversationId === this.currentConversationId) {
                    this.currentConversationId = AI.getCurrentConversationId();
                }
            }).catch((e) => {
                showError(e as string || '删除对话失败');
            });
        },

        editConversationTitle(conversationId: string, currentTitle: string) {
            openSoftKeyboard(
                () => currentTitle,
                (value) => {
                    const trimmedTitle = value.trim();
                    if (trimmedTitle && trimmedTitle !== currentTitle) {
                        AI.updateConversationTitle(conversationId, trimmedTitle).then(() => {
                            showSuccess('标题修改成功');
                            return this.loadConversationList();
                        }).catch((e) => {
                            showError(e as string || '修改对话标题失败');
                        });
                    }
                },
                (value) => {
                    if (!value.trim()) { return '标题不能为空'; }
                }
            );
        },

        editSearchKeyword() {
            openSoftKeyboard(
                () => this.searchKeyword,
                (value) => { this.searchKeyword = value; this.$forceUpdate(); }
            );
        },

        clearSearch() {
            this.searchKeyword = '';
            this.$forceUpdate();
        },

        formatTime,
    }
});

export default aiHistory;
