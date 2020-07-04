
module.exports = (Plugin, Api) => {
    const {Patcher, DiscordContextMenu, DiscordModules, DOMTools, Modals, PluginUtilities, Utilities, DiscordClasses, WebpackModules} = Api;

    return class VoiceChannelUserJoinNotification extends Plugin {
        constructor() {
            super();

            this.monitoringGuilds = [];
            this.monitoringUsers = [];
            this.afkChannels = [];
            this.maxLogEntries = 0;

            this.currentLocale = "";

            this.itemHTML = require("item.html");
        }

        expandDCFuncs() {
            const funcs = ["getVoiceStates", "getUser", "getChannel", "getGuild", "getGuilds", "getCurrentUser", "getStatus", "transitionToGuild", "getLocaleInfo"];
            funcs.forEach(funcName => {
                 this[funcName] = ZeresPluginLibrary.WebpackModules.getByProps(funcName)[funcName];
            });
        }

        checkPatchI18n() {
            const sysLocale = this.getLocaleInfo().code;
            if (this.currentLocale !== sysLocale) {
                this.currentLocale = sysLocale;

                // I18n patch
                for (let s = 0; s < this._config.defaultConfig.length; s++) {
                    const current = this._config.defaultConfig[s];
                    this.patchI18n("config", current);

                    if (current.type === "category") {
                        for (let s = 0; s < current.settings.length; s++) {
                            const subCurrent = current.settings[s];
                            this.patchI18n(`config.${current.id}`, subCurrent);
                        }
                    }
                }
            }
        }

        patchI18n(parentName, defConfigObj) {
            ["name", "note"].forEach(key => {
                if (defConfigObj.hasOwnProperty(key)) {
                    const localeText = this.getLocaleText(`${parentName}.${defConfigObj.id}.${key}`);
                    if (localeText !== undefined) {
                        defConfigObj[key] = localeText;
                    }
                }
            });
        }

        async onStart() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.expandDCFuncs();
            this.checkPatchI18n();

            this.log = [];
            this.lastStates = {};

            const localUser = this.getCurrentUser();

            this.parseSettings();
            if(this.settings.log.persistLog) {
                this.loadPersistLog();
            }

            this.contextMenuPatches = [];
            this.patchContextMenus();

            const logSaveCount = 120; // * 500ms => 60s
            let logSaveCounter = 0;
            let logChanged = false;

            this.update = setInterval(() => {
                if (this.settings.log.persistLog && logSaveCounter < logSaveCount) logSaveCounter++;

                if (!this.settings.options.allGuilds && this.monitoringGuilds.length == 0) return;
                if (this.monitoringUsers.length == 0) return;
            
                const allGuilds = [];
                this.afkChannels = [];
            
                Object.values(this.getGuilds()).forEach(g => {
                    allGuilds.push(g.id);
                    if (g.afkChannelId) this.afkChannels.push(g.afkChannelId);
                });
            
                const targetGuilds = this.settings.allGuilds ? allGuilds : this.monitoringGuilds;
            
                const newStates = targetGuilds.map(gid => this.getVoiceStates(gid)).reduce((a, v) => {return {...v, ...a}});

                for(let id in newStates) {
                    let noNotify = false;

                    if(localUser.id === id) continue;
                    if (!this.monitoringUsers.includes(id)) {
                        if (this.settings.log.logAllUsers) noNotify = true;
                        else continue;
                    }

                    if(this.lastStates[id] === undefined) {
                        const user = this.getUser(id), channel = this.getChannel(newStates[id].channelId);
                        if(user && channel) {
                            const guild = this.getGuild(channel.guild_id);
                            this.notificationAndLog({act: "Join", user, channel, guild}, noNotify);
                            logChanged = true;
                        }
                    } else {

                        if(this.lastStates[id].channelId !== newStates[id].channelId) {

                            const user = this.getUser(id), channel = this.getChannel(newStates[id].channelId);
                            const lastChannel = this.getChannel(this.lastStates[id].channelId);

                            if(user && channel) {
                                const guild = this.getGuild(channel.guild_id);
                                this.notificationAndLog({act: "Move", user, channel, lastChannel, guild}, noNotify);
                                logChanged = true;
                            }

                            continue;

                        }

                    }

                }

                for(let id in this.lastStates) {
                    let noNotify = false;

                    if(localUser.id === id) continue;
                    if (!this.monitoringUsers.includes(id)) {
                        if (this.settings.log.logAllUsers) noNotify = true;
                        else continue;
                    }

                    if(newStates[id] === undefined && id !== localUser.id) {
                        const user = this.getUser(id), channel = this.getChannel(this.lastStates[id].channelId);
                        if(user && channel) {
                            const guild = this.getGuild(channel.guild_id);
                            this.notificationAndLog({act: "Leave", user, channel, guild}, noNotify);
                            logChanged = true;
                        }
                    }
                }

                this.lastStates = newStates;

                if (logChanged && logSaveCounter >= logSaveCount) {
                    logChanged = false;
                    logSaveCounter = 0;

                    this.savePersistLog();
                }
            }, 500);

            this.focused = true;

            this.focus = () => this.focused = true;
            this.unfocus = () => this.focused = false;

            window.addEventListener("focus", this.focus);
            window.addEventListener("blur", this.unfocus);

            this.onKeyDown = e => {

                if(this.settings.options.logHotkey && e.altKey && e.key == "v") {
                    this.showVoiceLogModal();
                }

            };

            document.addEventListener("keydown", this.onKeyDown);
        }

        onStop() {
            clearInterval(this.update);
            window.removeEventListener("focus", this.focus);
            window.removeEventListener("blur", this.unfocus);
            document.removeEventListener("keydown", this.onKeyDown);
            this.unpatchContextMenus();
            this.saveSettings();
        }

        getLocalStatus() {
            return this.getStatus(this.getCurrentUser().id);
        }

        parseSettings() {
            this.monitoringGuilds = [];
            this.monitoringUsers = [];
            this.settings.monitoring.guilds.split(",").forEach(l => {
                this.monitoringGuilds.push(l.split("#")[0].trim());
            });
            this.settings.monitoring.users.split(",").forEach(l => {
                this.monitoringUsers.push(l.split("#")[0].trim());
            });

            this.maxLogEntries = parseInt(this.settings.log.maxLogEntries, 10);
        }

        loadPersistLog() {
            const {lastStates, log} = PluginUtilities.loadData(this.getName() + 'Data', 'data', {
                lastStates: {},
                log: []
            });
            this.lastStates = lastStates;
            this.log = log;
        }

        savePersistLog() {
            PluginUtilities.saveData(this.getName() + 'Data', 'data', {
                lastStates: this.lastStates,
                log: this.log
            });
        }

        unpatchContextMenus() {
            this.contextMenuPatches.forEach(f => f());
        }

        patchContextMenus() {
            this.patchGuildContextMenu();
            this.patchVoiceChannelContextMenu();
            this.patchUserContextMenu();
        }

        patchGuildContextMenu() {
            const GuildContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "GuildContextMenu");
            this.contextMenuPatches.push(Patcher.after(GuildContextMenu, "default", (_, [props], retVal) => {
                Utilities.getNestedProp(
                    Utilities.findInReactTree(retVal, e => e && e.type && e.type.displayName === 'Menu'),
                    'props.children'
                ).push(DiscordContextMenu.buildMenuItem({
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({guildId: props.guild.id});
                    }
                }));
            }));
        }

        patchVoiceChannelContextMenu() {
            const VCCMs = WebpackModules.getModules(m => m.default && m.default.displayName == "ChannelListVoiceChannelContextMenu");
            const patch = (_, [props], retVal) => {
                Utilities.getNestedProp(
                    Utilities.findInReactTree(retVal, e => e && e.type && e.type.displayName === 'Menu'),
                    'props.children'
                ).push(DiscordContextMenu.buildMenuItem({
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({channelId: props.channel.id});
                    }
                }));
            };
            VCCMs.forEach(VCCM => {
                this.contextMenuPatches.push(Patcher.after(VCCM, "default", patch));
            });
        }

        patchUserContextMenu() {
            const UserContextMenu = WebpackModules.getModule(m => m.default && m.default.displayName == "GuildChannelUserContextMenu");
            this.contextMenuPatches.push(Patcher.after(UserContextMenu, "default", (_, [props], retVal) => {
                Utilities.getNestedProp(
                    Utilities.findInReactTree(retVal, e => e && e.type && e.type.displayName === 'Menu'),
                    'props.children'
                ).push(DiscordContextMenu.buildMenuItem({
                    label: this.getLocaleText("contextmenuVoiceLog"), action: () => {
                        this.showVoiceLogModal({userId: props.user.id});
                    }
                }));
            }));
        }

        showVoiceLogModal({userId, channelId, guildId}={}) {
            this.checkPatchI18n();
            let log = this.log;
            if (guildId !== undefined) log = log.filter(entry => entry.guildId === guildId);
            if (channelId !== undefined) log = log.filter(entry => entry.channelId === channelId || entry.lastChannelId === channelId);
            if (userId !== undefined) log = log.filter(entry => entry.userId === userId);
            const ce = DiscordModules.React.createElement;
            const AuditLog = DiscordClasses.AuditLog;
            const children = log.map(entry => {
                const user = this.getUser(entry.userId);
                const channel = this.getChannel(entry.channelId);
                const guild = this.getGuild(entry.guildId);
                if (user === undefined || channel === undefined || guild === undefined) return null;
                return ce("div", { dangerouslySetInnerHTML:{ __html: Utilities.formatString(this.itemHTML, {
                    user_name: DOMTools.escapeHTML(user.username),
                    user_discrim: user.discriminator,
                    avatar_url: user.getAvatarURL(),
                    action: DOMTools.escapeHTML(this.getLocaleText(`notification${entry.act}`)),
                    channel_name: DOMTools.escapeHTML(channel.name),
                    guild_icon: guild.getIconURL(),
                    guild_name: DOMTools.escapeHTML(guild.name),
                    timestamp: DOMTools.escapeHTML(new Date(entry.timestamp).toLocaleString())
                }) } });
            });
            Modals.showModal(this.getLocaleText("modalLogTitle"), children, {cancelText: null});
        }

        pushLog(logEntry){
            this.log.unshift(logEntry);
            if (this.log.length > this.maxLogEntries) {
                this.log.pop();
            }
        }

        notificationAndLog({act, user, channel, lastChannel, guild}, noNotify) {
            const lastChannelId = lastChannel === undefined ? null : lastChannel.id;
            this.pushLog({userId: user.id, channelId: channel.id, lastChannelId, guildId: guild.id, timestamp: new Date().getTime(), act});
            if(!noNotify && !(this.settings.options.suppressInDnd && this.getLocalStatus() == "dnd") && !this.afkChannels.includes(channel.id) && (act !== "Leave" || this.settings.options.notifyLeave)) {
                this.checkPatchI18n();
                const notification = new Notification(this.getLocaleText(`notification${act}Message`, {user: user.username, channel: channel.name, guild: guild.name}), {silent: this.settings.options.silentNotification, icon: user.getAvatarURL()});
                if (act === "Join" || act === "Move") {
                    notification.addEventListener("click", () => {
                        this.transitionToGuild(guild.id);
                    });
                }
            }
        }

        getLocaleText(id, args) {
            switch (this.getLocaleInfo().code) {
                case "zh-TW":
                    switch (id) {
                        case "config.monitoring.name":
                            return "監測清單";
                        case "config.options.name":
                            return "其他選項";
                        case "config.monitoring.guilds.name":
                            return "檢查伺服器ID ( , 分隔，ID後可加#註解)";
                        case "config.monitoring.guilds.note":
                            return "伺服器ID，多組時使用 , 來分隔，ID後可加#註解";
                        case "config.monitoring.users.name":
                            return "檢查使用者 ( , 分隔，ID後可加#註解)";
                        case "config.monitoring.users.note":
                            return "使用<使用者ID>，多組時使用 , 來分隔，ID後可加#註解";
                        case "config.log.name":
                            return "記錄相關選項";
                        case "config.log.logAllUsers.name":
                            return "記錄所有使用者";
                        case "config.log.persistLog.name":
                            return "儲存紀錄";
                        case "config.log.maxLogEntries.name":
                            return "最大紀錄數量";
                        case "config.options.allGuilds.name":
                            return "檢查所有已加入伺服器";
                        case "config.options.notifyLeave.name":
                            return "通知退出語音頻道";
                        case "config.options.silentNotification.name":
                            return "使用無聲通知";
                        case "config.options.suppressInDnd.name":
                            return "勿擾模式時關閉通知";
                        case "config.options.logHotkey.name":
                            return "啟用 Alt+V 開啟記錄視窗";
                        
                        case "notificationJoinMessage":
                            return `${args.user} 進入了 ${args.channel} @ ${args.guild}`;
                        case "notificationJoin":
                            return "進入了";
                        case "notificationMoveMessage":
                            return `${args.user} 移動到 ${args.channel} @ ${args.guild}`;
                        case "notificationMove":
                            return "移動到";
                        case "notificationLeaveMessage":
                            return `${args.user} 離開 ${args.channel} @ ${args.guild}`;
                        case "notificationLeave":
                            return "離開";

                        case "modalLogTitle":
                            return "語音通知紀錄";
                        case "contextmenuVoiceLog":
                            return "語音記錄";
                    }
                case "en-US":
                default:
                    switch (id) {
                        case "config.monitoring.name":
                            return "Monitoring List";
                        case "config.options.name":
                            return "Other Options";
                        case "config.monitoring.guilds.name":
                            return "Monitoring Guild IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "config.monitoring.guilds.note":
                            return "Guild IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "config.monitoring.users.name":
                            return "Monitoring User IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "config.monitoring.users.note":
                            return "User IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "config.log.name":
                            return "Log related";
                        case "config.log.logAllUsers.name":
                            return "Log all user actions";
                        case "config.log.persistLog.name":
                            return "Persist log";
                        case "config.log.maxLogEntries.name":
                            return "Max log entries counts";
                        case "config.options.allGuilds.name":
                            return "Monitor all guilds";
                        case "config.options.notifyLeave.name":
                            return "Notify user leaves";
                        case "config.options.silentNotification.name":
                            return "Silent notifications";
                        case "config.options.suppressInDnd.name":
                            return "Suppress notifications while in Do Not Disturb";
                        case "config.options.logHotkey.name":
                            return "Enable Alt+V Log Panel";
                        
                        case "notificationJoinMessage":
                            return `${args.user} joined ${args.channel} @ ${args.guild}`;
                        case "notificationJoin":
                            return "Joined";
                        case "notificationMoveMessage":
                            return `${args.user} moved to ${args.channel} @ ${args.guild}`;
                        case "notificationMove":
                            return "Moved to";
                        case "notificationLeaveMessage":
                            return `${args.user} left ${args.channel} @ ${args.guild}`;
                        case "notificationLeave":
                            return "Left";

                        case "modalLogTitle":
                            return "Voice Notification Log";
                        case "contextmenuVoiceLog":
                            return "Voice Log";
                    }
            }
        }

        getSettingsPanel() {
            this.checkPatchI18n();
            const panel = this.buildSettingsPanel();
            panel.addListener(this.parseSettings.bind(this));
            return panel.getElement();
        }

    };
};
