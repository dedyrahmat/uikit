import { assign, isString, off, on, promise, toNode } from './index';

var id = 0;

export class Player {

    constructor(el) {
        this.id = ++id;
        this.el = toNode(el);
    }

    isVideo() {
        return this.isYoutube() || this.isVimeo() || this.isHTML5();
    }

    isHTML5() {
        return this.el.tagName === 'VIDEO';
    }

    isIFrame() {
        return this.el.tagName === 'IFRAME';
    }

    isYoutube() {
        return this.isIFrame() && !!this.el.src.match(/\/\/.*?youtube\.[a-z]+\/(watch\?v=[^&\s]+|embed)|youtu\.be\/.*/);
    }

    isVimeo() {
        return this.isIFrame() && !!this.el.src.match(/vimeo\.com\/video\/.*/);
    }

    enableApi() {

        let poller;

        if (this.ready) {
            return this.ready;
        }

        var youtube = this.isYoutube(), vimeo = this.isVimeo();

        if (youtube || vimeo) {

            return this.ready = promise(resolve => {

                var loadHandler = () => {

                    if (youtube) {
                        var listener = () => post(this.el, {event: 'listening', id: this.id});
                        poller = setInterval(listener, 100);
                        listener();
                    }

                    off(this.el, 'load', loadHandler);
                };

                on(this.el, 'load', loadHandler);

                this.el.setAttribute('src', `${this.el.src}${~this.el.src.indexOf('?') ? '&' : '?'}${youtube ? 'enablejsapi=1' : `api=1&player_id=${id}`}`);

                var msgHandler = (e) => {

                    var data = e.data;

                    if (!data || !isString(data)) {
                        return;
                    }

                    try {
                        data = JSON.parse(data);
                    } catch(err) {
                        return;
                    }

                    if ((youtube && data.id === this.id && data.event === 'onReady')
                        || (vimeo && Number(data.player_id) === this.id)
                    ) {
                        resolve();
                        poller && clearInterval(poller);
                        off(window, 'message', msgHandler)
                    }

                };

                on(window, 'message', msgHandler);

            });

        }

        return promise.resolve();

    }

    play() {

        if (!this.isVideo()) {
            return;
        }

        if (this.isIFrame()) {
            this.enableApi().then(() => post(this.el, {func: 'playVideo', method: 'play'}))
        } else if (this.isHTML5()) {
            this.el.play();
        }
    }

    pause() {

        if (!this.isVideo()) {
            return;
        }

        if (this.isIFrame()) {
            this.enableApi().then(() => post(this.el, {func: 'pauseVideo', method: 'pause'}))
        } else if (this.isHTML5()) {
            this.el.pause();
        }
    }

    mute() {

        if (!this.isVideo()) {
            return;
        }

        if (this.isIFrame()) {
            this.enableApi().then(() => post(this.el, {func: 'mute', method: 'setVolume', value: 0}))
        } else if (this.isHTML5()) {
            this.el.setAttribute('muted', '');
        }

    }

}

function post(el, cmd) {
    el.contentWindow.postMessage(JSON.stringify(assign({event: 'command'}, cmd)), '*');
}
