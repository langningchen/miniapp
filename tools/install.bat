rem Copyright (C) 2025 Langning Chen
rem 
rem This file is part of miniapp.
rem 
rem miniapp is free software: you can redistribute it and/or modify
rem it under the terms of the GNU General Public License as published by
rem the Free Software Foundation, either version 3 of the License, or
rem (at your option) any later version.
rem 
rem miniapp is distributed in the hope that it will be useful,
rem but WITHOUT ANY WARRANTY; without even the implied warranty of
rem MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
rem GNU General Public License for more details.
rem 
rem You should have received a copy of the GNU General Public License
rem along with miniapp.  If not, see <https://www.gnu.org/licenses/>.

adb push Z:\home\langningchen\miniapp\8001749644971194.0_0_1.amr /userdisk/Favorite/miniapp2.amr & adb shell miniapp_cli install /userdisk/Favorite/miniapp2.amr & adb shell miniapp_cli start 8001749644971194
adb shell cat /userdata/applog/DictPen_*.log
adb pull /userdisk/database/langningchen-ai.db langningchen-ai.db
adb push langningchen-ai.db /userdisk/database/langningchen-ai.db
adb shell rm /userdisk/database/langningchen-ai.db
