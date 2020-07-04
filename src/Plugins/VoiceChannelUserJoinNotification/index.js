
module.exports = (Plugin, Api) => {
    const {PluginUtilities, DiscordModules, DiscordSelectors, ReactTools, DOMTools, Modals, Utilities, DiscordClasses, WebpackModules} = Api;

    return class VoiceChannelUserJoinNotification extends Plugin {
        constructor() {
            super();

            this.monitoringGuilds = [];
            this.monitoringUsers = [];
            this.afkChannels = [];

            this.itemHTML = require("item.html");
        }

        expandDCFuncs() {
            const funcs = ["getVoiceStates", "getUser", "getChannel", "getGuild", "getGuilds", "getCurrentUser", "getStatus", "transitionToGuild", "getLocaleInfo"];
            funcs.forEach(funcName => {
                 this[funcName] = ZeresPluginLibrary.WebpackModules.getByProps(funcName)[funcName];
            });
        }

        async onStart() {
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.expandDCFuncs();

            this.log = [];

            let lastStates = [];

            const localUser = this.getCurrentUser();

            this.parseMatchlist();

            this.update = setInterval(() => {

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

                    if(localUser.id == id) continue;
                    if(!this.monitoringUsers.includes(id)) continue;

                    if(lastStates[id] == undefined) {
                        const user = this.getUser(id), channel = this.getChannel(newStates[id].channelId);
                        if(user && channel) {
                            const guild = this.getGuild(channel.guild_id);
                            this.notificationAndLog({act: "Join", user, channel, guild});
                        }
                    } else {

                        if(lastStates[id].channelId != newStates[id].channelId) {

                            const user = this.getUser(id), channel = this.getChannel(newStates[id].channelId);

                            if(user && channel) {
                                const guild = this.getGuild(channel.guild_id);
                                this.notificationAndLog({act: "Move", user, channel, guild});
                            }

                            continue;

                        }

                    }

                }

                for(let id in lastStates) {
                    if(localUser.id == id) continue;
                    if(!this.monitoringUsers.includes(id)) continue;

                    if(newStates[id] == undefined && id != localUser.id) {
                        const user = this.getUser(id), channel = this.getChannel(lastStates[id].channelId);
                        if(user && channel) {
                            const guild = this.getGuild(channel.guild_id);
                            this.notificationAndLog({act: "Leave", user, channel, guild});
                        }
                    }
                }

                lastStates = newStates;

            }, 500);

            this.focused = true;

            this.focus = () => this.focused = true;
            this.unfocus = () => this.focused = false;

            window.addEventListener("focus", this.focus);
            window.addEventListener("blur", this.unfocus);

            this.onKeyDown = e => {

                if(this.settings.options.logHotkey && e.altKey && e.key == "v") {

                    this.showVoiceLogModal();

                    /*
                    if(document.getElementById("vcn-log")) return;

                    const list = NeatoLib.UI.createBasicScrollList("vcn-log", "Voice Notification Log", { width : 400, height : 500 });

                    if(this.log.length > 50) this.log.splice(50, this.log.length);

                    for(let i = 0; i < this.log.length; i++) {
                        list.scroller.insertAdjacentHTML("afterbegin", `
                    
                        <div class="message-group hide-overflow">
                            <div class="avatar-large stop-animation" style="background-image: url(${this.log[i].avatar});"></div>
                            <div class="comment">
                                <div class=NeatoLib.Modules.get("message").message.split(" ").join("")>
                                    <div class="body">
                                        <h2 class="old-h2"><span class="username-wrapper"><strong class="user-name" style="color: white">${this.log[i].username}</strong></span><span class="highlight-separator"> - </span><span class="timestamp">${this.log[i].timestamp}</span></h2>
                                        <div class="message-text">
                                            <div class=NeatoLib.Modules.get("markup").markup.split(" ").join("")>${this.log[i].text}.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    
                        `);
                    }
                   */

                }

            };

            document.addEventListener("keydown", this.onKeyDown);
        }

        onStop() {
            clearInterval(this.update);
            window.removeEventListener("focus", this.focus);
            window.removeEventListener("blur", this.unfocus);
            document.removeEventListener("keydown", this.onKeyDown);
            this.saveSettings();
        }

        getLocalStatus() {
            return this.getStatus(this.getCurrentUser().id);
        }

        parseMatchlist() {
            this.monitoringGuilds = [];
            this.monitoringUsers = [];
            this.settings.monitoring.guilds.split(",").forEach(l => {
                this.monitoringGuilds.push(l.split("#")[0].trim());
            });
            this.settings.monitoring.users.split(",").forEach(l => {
                this.monitoringUsers.push(l.split("#")[0].trim());
            });
        }

        showVoiceLogModal() {
            const ce = DiscordModules.React.createElement;
            const AuditLog = DiscordClasses.AuditLog;
            const children = this.log.map(log => {
                const user = this.getUser(log.user_id);
                const channel = this.getChannel(log.channel_id);
                const guild = this.getGuild(log.guild_id);
                return ce("div", { dangerouslySetInnerHTML:{ __html: Utilities.formatString(this.itemHTML, {
                    user_name: DOMTools.escapeHTML(user.username),
                    user_discrim: user.discriminator,
                    avatar_url: user.getAvatarURL(),
                    action: DOMTools.escapeHTML(this.getLocaleText(`notification${log.act}`)),
                    channel_name: DOMTools.escapeHTML(channel.name),
                    guild_icon: guild.getIconURL(),
                    guild_name: DOMTools.escapeHTML(guild.name),
                    timestamp: DOMTools.escapeHTML(log.timestamp)
                }) } });
            });
            Modals.showModal("Voice Notification Log", children, {cancelText: null});
        }

        notificationAndLog({act, user, channel, guild}) {
            //this.log.push({avatar: user.getAvatarURL(), username: user.username , timestamp : new Date().toLocaleTimeString(), text : this.getLocaleText(`notification${act}Log`, {channel: channel.name, guild: guild.name})});
            this.log.push({user_id: user.id, channel_id: channel.id, guild_id: guild.id, timestamp: new Date().toLocaleTimeString(), act});
            if(!(this.settings.options.suppressInDnd && this.getLocalStatus() == "dnd") && !this.afkChannels.includes(channel.id) && (act !== "Leave" || this.settings.options.notifyLeave)) {
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
                        case "settingsGuildsTitle":
                            return "檢查伺服器ID ( , 分隔，ID後可加#註解)";
                        case "settingsGuildsNote":
                            return "伺服器ID，多組時使用 , 來分隔，ID後可加#註解";
                        case "settingsUsersTitle":
                            return "檢查使用者 ( , 分隔，ID後可加#註解)";
                        case "settingsUsersNote":
                            return "使用<使用者ID>，多組時使用 , 來分隔，ID後可加#註解";
                        case "settingsAllGuilds":
                            return "檢查所有已加入伺服器";
                        case "settingsNotifyLeave":
                            return "通知退出語音頻道";
                        case "settingsSilentNofification":
                            return "使用無聲通知";
                        case "settingsSuppressInDnd":
                            return "勿擾模式時關閉通知";
                        case "settingsLogHotkey":
                            return "啟用 Alt+V 開啟記錄視窗";
                        
                        case "notificationJoinMessage":
                            return `${args.user} 進入了 ${args.channel} @ ${args.guild}`;
                        case "notificationJoinLog":
                            return `進入了 ${args.channel} @ ${args.guild}`;
                        case "notificationJoin":
                            return "進入了";
                        case "notificationMoveMessage":
                            return `${args.user} 移動到 ${args.channel} @ ${args.guild}`;
                        case "notificationMoveLog":
                            return `移動到 ${args.channel} @ ${args.guild}`;
                        case "notificationMove":
                            return "移動到";
                        case "notificationLeaveMessage":
                            return `${args.user} 離開 ${args.channel} @ ${args.guild}`;
                        case "notificationLeaveLog":
                            return `離開 ${args.channel} @ ${args.guild}`;
                        case "notificationLeave":
                            return "離開";
                    }
                case "en-US":
                default:
                    switch (id) {
                        case "settingsGuildsTitle":
                            return "Monitoring Guild IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsGuildsNote":
                            return "Guild IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsUsersTitle":
                            return "Monitoring User IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsUsersNote":
                            return "User IDs (seprated with \",\" and append \"#\" after id for commenting)";
                        case "settingsAllGuilds":
                            return "Monitor all guilds";
                        case "settingsNotifyLeave":
                            return "Notify user leaves";
                        case "settingsSilentNofification":
                            return "Silent notifications";
                        case "settingsSuppressInDnd":
                            return "Suppress notifications while in Do Not Disturb";
                        case "settingsLogHotkey":
                            return "Enable Alt+V Log Panel";
                        
                        case "notificationJoinMessage":
                            return `${args.user} joined ${args.channel} @ ${args.guild}`;
                        case "notificationJoinLog":
                            return `Joined ${args.channel} @ ${args.guild}`;
                        case "notificationMoveMessage":
                            return `${args.user} moved to ${args.channel} @ ${args.guild}`;
                        case "notificationMoveLog":
                            return `Moved to ${args.channel} @ ${args.guild}`;
                        case "notificationLeaveMessage":
                            return `${args.user} left ${args.channel} @ ${args.guild}`;
                        case "notificationLeaveLog":
                            return `Left ${args.channel} @ ${args.guild}`;
                    }
            }
        }


        buildSetting(data) {
            const setting = super.buildSetting(data);
            if (setting !== null) {
                if (setting.name.startsWith("i18n:")) setting.name = this.getLocaleText(setting.name.substr(5));
                if (setting.note.startsWith("i18n:")) setting.note = this.getLocaleText(setting.note.substr(5));
            }
            return setting;
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener(this.parseMatchlist.bind(this));
            return panel.getElement();
        }

    };
};
