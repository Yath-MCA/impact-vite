document.addEventListener('DOMContentLoaded', function(event) {
    window.demoIntervalCounter = 0;

    var demoInterval = setInterval(() => {

        if (SHARED_KEY && ((/springer/gi.test(SHARED_KEY.division)) || (SHARED_KEY.demo && SHARED_KEY.demo == "spr"))) {

            $('#vmaintitle,#r-label').html('Book Title');
            $('#headerlabel,#l-label').html('Chapter Title');

            const coverDiv = document.querySelector('.cover_div');
            $("#doi").addClass("ds-none");

            if (coverDiv) {
                $(coverDiv).find("img").remove();
                $(coverDiv).parent().removeClass("ds-none");

                const src = BUCKET_URL + DOC_ID + '/cover.png';
                const image = document.createElement('img');
                image.setAttribute('id', 'image000');
                image.setAttribute('class', 'card-img-left shadow');
                image.setAttribute('alt', 'cover');
                image.setAttribute('src', src);
                if (coverDiv) {
                    coverDiv.classList.remove('ds-none');
                    coverDiv.appendChild(image);
                }

            }

            if (typeof GlobalEditor != "undefined" && GlobalEditor && GlobalEditor.document) {

                GlobalEditor.document.find(`[data-name="alt-text"]`).toArray().forEach(el => {
                    el.remove();
                });

            }


            if (window.demoIntervalCounter > 5) clearInterval(demoInterval);
            else window.demoIntervalCounter++;
        }

        if (SHARED_KEY.client == "PLOS" && !IS_LIVE_DOMAIN) {
            window.IS_PLOS_DEMO = false;
        }

    }, 1500);

});