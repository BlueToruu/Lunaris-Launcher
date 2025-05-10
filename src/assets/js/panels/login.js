const { AZauth, Mojang } = require('minecraft-java-core');
const { ipcRenderer } = require('electron');

import { popup, database, changePanel, accountSelect, addAccount, config, setStatus } from '../utils.js';

class Login {
    static id = "login";

    async init(config) {
        this.config = config;
        this.db = new database();

        document.querySelector('.login-select').style.display = 'block';

        // Mostrar Microsoft
        document.querySelector('.select-microsoft').addEventListener('click', () => {
            this.showPanel('.login-home');
        });

        // Mostrar Offline
        document.querySelector('.select-offline').addEventListener('click', () => {
            this.showPanel('.login-offline');
        });

        // Botón volver (ambos usan la misma clase 'back-button')
        document.querySelectorAll('.back-button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showPanel('.login-select');
            });
        });

        // Botón login Microsoft
        document.querySelector('.connect-home').addEventListener('click', () => this.getMicrosoft());

        // Botón login Offline
        document.querySelector('.connect-offline').addEventListener('click', () => this.getCrack());
    }

    showPanel(selector) {
        document.querySelectorAll('.login-tabs').forEach(tab => {
            tab.style.display = 'none';
        });
        document.querySelector(selector).style.display = 'block';
    }

    async getMicrosoft() {
        console.log('Login Microsoft iniciado');
        let popupLogin = new popup();

        popupLogin.openPopup({
            title: 'Conectando',
            content: 'Espere por favor...',
            color: 'var(--color)'
        });

        try {
            const account_connect = await ipcRenderer.invoke('Microsoft-window', this.config.client_id);
            if (account_connect && account_connect !== 'cancel') {
                await this.saveData(account_connect);
            }
        } catch (err) {
            popupLogin.openPopup({
                title: 'Error',
                content: err,
                options: true
            });
        }

        popupLogin.closePopup();
    }

    async getCrack() {
        console.log('Login Offline iniciado');
        let popupLogin = new popup();
        let email = document.querySelector('.email-offline').value;

        if (email.length < 3) {
            popupLogin.openPopup({
                title: 'Error',
                content: 'Tu Nick debe tener al menos 3 caracteres.',
                options: true
            });
            return;
        }

        if (email.match(/ /g)) {
            popupLogin.openPopup({
                title: 'Error',
                content: 'Tu Nick no debe contener espacios.',
                options: true
            });
            return;
        }

        let MojangConnect = await Mojang.login(email);

        if (MojangConnect.error) {
            popupLogin.openPopup({
                title: 'Error',
                content: MojangConnect.message,
                options: true
            });
            return;
        }

        await this.saveData(MojangConnect);
        popupLogin.closePopup();
    }

    async saveData(connectionData) {
        let configClient = await this.db.readData('configClient');
        let account = await this.db.createData('accounts', connectionData);
        let instanceSelect = configClient.instance_selct;
        let instancesList = await config.getInstanceList();
        configClient.account_selected = account.ID;

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(name => name == account.name);
                if (!whitelist && instance.name == instanceSelect) {
                    let newInstance = instancesList.find(i => !i.whitelistActive);
                    configClient.instance_selct = newInstance.name;
                    await setStatus(newInstance.status);
                }
            }
        }

        await this.db.updateData('configClient', configClient);
        await addAccount(account);
        await accountSelect(account);
        changePanel('home');
    }
}

export default Login;
