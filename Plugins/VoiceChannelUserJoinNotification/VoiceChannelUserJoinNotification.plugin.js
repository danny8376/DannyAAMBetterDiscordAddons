/**
 * @name VoiceChannelUserJoinNotification
 * @authorLink https://saru.moe
 * @website https://github.com/danny8376/DannyAAMBetterDiscordAddons/tree/master/Plugins/VoiceChannelUserJoinNotification
 * @source https://raw.githubusercontent.com/danny8376/DannyAAMBetterDiscordAddons/master/Plugins/VoiceChannelUserJoinNotification/VoiceChannelUserJoinNotification.plugin.js
 */
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

module.exports = (() => {
    const config = {info:{name:"VoiceChannelUserJoinNotification",authors:[{name:"DannyAAM",discord_id:"275978619354873856",github_username:"danny8376",twitter_username:"DannyAAMtw"}],version:"0.1.2",description:"A simple BetterDiscord plugin for you to monitor specific users joining voice channels in spcific guilds. (Originaly modified from VoiceChatNotifications by Metalloriff)",github:"https://github.com/danny8376/DannyAAMBetterDiscordAddons/tree/master/Plugins/VoiceChannelUserJoinNotification",github_raw:"https://raw.githubusercontent.com/danny8376/DannyAAMBetterDiscordAddons/master/Plugins/VoiceChannelUserJoinNotification/VoiceChannelUserJoinNotification.plugin.js"},changelog:[{title:"More Log",items:["Ability to persist log across restart.","Ability to log even non-monitoring (for notification) users joined/moved/left."]},{title:"Thanks",type:"progress",items:["This plugins is originaly modified from VoiceChatNotifications by Metalloriff (https://github.com/Metalloriff/BetterDiscordPlugins/blob/a056291d1498deb721908cce45cff5625c7a7f1e/VoiceChatNotifications.plugin.js). Learned from his plugins how to implement this plugin. Thanks for him."]}],main:"index.js",defaultConfig:[{type:"category",id:"monitoring",name:"i18n:MonitoringTitle",collapsible:false,shown:true,settings:[{type:"textbox",id:"guilds",name:"i18n:GuildsTitle",note:"i18n:GuildsNote",value:"000000000000000000#Example"},{type:"textbox",id:"users",name:"i18n:UsersTitle",note:"i18n:UsersNote",value:"000000000000000000#Example,000000000000000000"}]},{type:"category",id:"log",name:"i18n:LogTitle",collapsible:false,shown:true,settings:[{type:"switch",id:"logAllUsers",name:"i18n:LogAllUsers",note:"",value:false},{type:"switch",id:"persistLog",name:"i18n:PersistLog",note:"",value:false},{type:"textbox",id:"maxLogEntries",name:"i18n:MaxLogEntries",note:"",value:"250"}]},{type:"category",id:"options",name:"i18n:OptionsTitle",collapsible:false,shown:true,settings:[{type:"switch",id:"allGuilds",name:"i18n:AllGuilds",note:"",value:false},{type:"switch",id:"notifyLeave",name:"i18n:NotifyLeave",note:"",value:false},{type:"switch",id:"silentNotification",name:"i18n:SilentNotification",note:"",value:false},{type:"switch",id:"suppressInDnd",name:"i18n:SuppressInDnd",note:"",value:true},{type:"switch",id:"logHotkey",name:"i18n:LogHotkey",note:"",value:true}]}]};

    return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
    const {Patcher, DiscordContextMenu, DiscordModules, DOMTools, Modals, PluginUtilities, Utilities, DiscordClasses, WebpackModules} = Api;

    return class VoiceChannelUserJoinNotification extends Plugin {
        constructor() {
            super();

            this.monitoringGuilds = [];
            this.monitoringUsers = [];
            this.afkChannels = [];
            this.maxLogEntries = 0;

            this.currentLocale = "";

            this.itemHTML = `<div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 auditLog-3jNbM6 da-auditLog marginBottom8-AtZOdT da-marginBottom8" style="flex: 1 1 auto;">
  <div class="header-GwIGlr da-header" aria-expanded="false" role="button" tabindex="0">
    <div class="avatar-_VZUJy da-avatar wrapper-3t9DeA da-wrapper" role="img" aria-hidden="true" style="width: 40px; height: 40px;">
      <svg width="49" height="40" viewBox="0 0 49 40" class="mask-1l8v16 da-mask svg-2V3M55 da-svg" aria-hidden="true">
        <foreignObject x="0" y="0" width="40" height="40" mask="url(#svg-mask-avatar-default)">
          <img src="{{avatar_url}}" alt=" " class="avatar-VxgULZ da-avatar" aria-hidden="true">
        </foreignObject>
      </svg>
    </div>
    <div class="flex-1xMQg5 flex-1O1GKY da-flex da-flex vertical-V37hAW flex-1O1GKY directionColumn-35P_nr justifyStart-2NDFzi alignStretch-DpGPf3 noWrap-3jynv6 timeWrap-2DasL6 da-timeWrap" style="flex: 1 1 auto;">
      <div class="overflowEllipsis-1PBFxQ da-overflowEllipsis flexChild-faoVW3 da-flexChild" style="flex: 1 1 auto; word-wrap: break-word; white-space: normal;">
        <span class="userHook-3AdCBF da-userHook"><span>{{user_name}}</span><span class="discrim-3rYTMj da-discrim">#{{user_discrim}}</span></span> {{action}} <span class="targetChannel-TrRFlx da-targetChannel"><strong>#{{channel_name}}</strong></span> @ <img class="icon-27yU2q da-icon" src="{{guild_icon}}" alt="" style="display: inline; border-radius: 50%; width: 2em; height: 2em;" aria-hidden="true"><span class="targetChannel-TrRFlx da-targetChannel"><strong>{{guild_name}}</strong></span>
      </div>
      <div class="timestamp-1mruiI da-timestamp">{{timestamp}}</div>
    </div>
  </div>
</div>

`;
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
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();

/*@end@*/