/*
SupJav 设备本地浏览器版（csp_GM userscript）

配合含 com.github.catvod.spider.GM 的 GM.jar 使用。首次验证及后续业务请求均在
目标设备同一 WebView/CookieManager 中完成，不搬运开发机 cf_clearance。
*/
// ==UserScript==
// @name         SupJav Local WebView
// @namespace    gmspider
// @version      2026.08.12
// @description  SupJav GMSpider with current data-link playback chain
// @match        https://supjav.com/*
// @require      https://cdn.jsdelivr.net/npm/jquery@1.12.4/dist/jquery.min.js
// @grant        unsafeWindow
// ==/UserScript==
(function () {
    const A = {};
    if (typeof GmSpiderInject !== 'undefined') {
        const args = JSON.parse(GmSpiderInject.GetSpiderArgs());
        A.fName = args.shift(); A.fArgs = args;
    } else { A.fName = 'homeContent'; A.fArgs = [true]; }
    Object.freeze(A);

    function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
    function pageCount() {
        let n = 1;
        jQuery('.pagination li').not('.next-page').each(function () {
            const x = parseInt(clean(jQuery(this).text())); if (x > n) n = x;
        }); return n;
    }
    function listVideos() {
        const out = [];
        jQuery('.posts .post, .post').each(function () {
            const a = jQuery(this).find('a.img').first();
            if (!a.length || !a.attr('href')) return;
            const u = new URL(a.attr('href'), location.href);
            const id = u.pathname.replace(/^\/zh\//, '').replace(/^\//, '');
            if (!/\.html$/i.test(id)) return;
            const im = jQuery(this).find('img').first();
            out.push({vod_id:id, vod_name:a.attr('title') || im.attr('alt') || id,
                vod_pic:im.data('original') || im.attr('data-src') || im.attr('src') || '',
                vod_remarks:clean(jQuery(this).find('.date').first().text())});
        }); return out;
    }
    function baseName() {
        const alt = clean(jQuery('.post-meta img.img, .post-meta .img').first().attr('alt'));
        const x = alt.replace('[无码破解]', '');
        const m = x.match(/^[\w|]+-[\w|-]+/); return m ? m[0] : (x || document.title);
    }
    const G = {
        homeContent: function () {
            const cls = [
                ['popular','热门'],['category/censored-jav','有码'],['category/uncensored-jav','无码'],
                ['category/amateur','素人'],['category/chinese-subtitles','中文字幕'],
                ['category/reducing-mosaic','无码破解'],['category/english-subtitles','英文字幕'],['tag','类别']
            ];
            const filters = {}, def = [{key:'sort',name:'排序',value:[{n:'观看数',v:'views'},{n:'更新时间',v:'quantity'}]}];
            cls.forEach(x => filters[x[0]] = def);
            filters.popular = [{key:'sort',name:'时间',value:[{n:'本月热门',v:'month'},{n:'本周热门',v:'week'},{n:'今日热门',v:'quantity'}]}];
            return {class:cls.map(x=>({type_id:x[0],type_name:x[1]})), filters:filters, list:listVideos()};
        },
        categoryContent: function (tid) {
            if (tid === 'tag') {
                const list=[]; jQuery('.categorys .child').each(function(){
                    const a=jQuery(this).find('a').first(), u=new URL(a.attr('href'),location.href);
                    list.push({vod_id:u.pathname.replace(/^\/zh\//,'').replace(/^\//,'').replace(/\/$/,''),
                        vod_name:clean(a.text()).split('(')[0],vod_remarks:'分类',vod_tag:'folder'});
                }); return {list:list,pagecount:1};
            }
            return {list:listVideos(),pagecount:pageCount()};
        },
        searchContent: function () { return {list:listVideos(),pagecount:pageCount()}; },
        detailContent: function (ids) {
            const id=ids[0], name=baseName(), pic=jQuery('.post-meta img.img, .post-meta .img').first().attr('src') || '';
            const from=[], urls=[];
            jQuery('.video-wrap .btn-server, .btn-server[data-link]').each(function(i){
                const token=jQuery(this).attr('data-link'); if(!token)return;
                const label=clean(jQuery(this).text())||('线路'+(i+1)); from.push(label);
                urls.push(name+'$'+JSON.stringify({token:token,index:i,detail:location.href}));
            });
            return {list:[{vod_id:id,vod_name:name,vod_pic:pic,vod_content:clean(jQuery('.post-meta .img').attr('alt')),
                vod_play_from:from.join('$$$'),vod_play_url:urls.join('$$$')}]};
        },
        playerContent: function (flag,id) {
            let x={}; try{x=JSON.parse(String(id).split('$').pop())}catch(e){}
            const btn=document.querySelectorAll('.video-wrap .btn-server, .btn-server[data-link]')[x.index||0];
            if(btn)btn.dispatchEvent(new Event('click',{bubbles:true}));
            return {type:'match'};
        }
    };
    jQuery(function(){
        const result=G[A.fName].apply(G,A.fArgs);
        if(typeof GmSpiderInject!=='undefined')GmSpiderInject.SetSpiderResult(JSON.stringify(result));
    });
})();
