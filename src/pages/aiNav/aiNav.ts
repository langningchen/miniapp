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
import { ConversationNode } from '../../@types/langningchen';
import { showError } from '../../components/ToastMessage';
import { formatTime } from '../../utils/timeUtils';

export default defineComponent({
    data() {
        return {
            $page: {} as FalconPage<null>,
            messages: [] as ConversationNode[],
            aiInitialized: false
        };
    },

    async mounted() {
        try {
            AI.initialize();
            this.aiInitialized = true;
            this.messages = AI.getCurrentPath();
        } catch (e) {
            showError(e as string || '初始化失败');
        }
    },

    methods: {
        jumpToMessage(messageId: string) {
            if (!this.aiInitialized) return;
            try {
                $falcon.trigger<string>('jump', messageId);
                this.$page.finish();
            } catch (e) {
                showError(e as string || '跳转到消息失败');
            }
        },
        formatTime,
    }
});
