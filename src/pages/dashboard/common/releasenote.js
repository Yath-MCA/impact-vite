$(function() {

    /* ── SVG icon map for nav states ─────────────────────────────── */
    var ICONS = {
        r_icon: {
            default: 'assets/images/svg/release/AllReleasesDefault.svg',
            selected: 'assets/images/svg/release/AllReleasesSelected.svg'
        },
        b_icon: {
            default: 'assets/images/svg/release/BugFixesDefault.svg',
            selected: 'assets/images/svg/release/BugFixesSelected.svg'
        },
        u_icon: {
            default: 'assets/images/svg/release/UpgradesDefault.svg',
            selected: 'assets/images/svg/release/UpgradesSelected.svg'
        }
    };

    /* Icon ids indexed by nav data-content value */
    var ICON_MAP = {
        releases: 'r_icon',
        bugfixes: 'b_icon',
        upgrades: 'u_icon'
    };

    /* ── Build a single ticket card ───────────────────────────────── */
    function buildTicket(item, type) {
        var barClass = 'ticket__bar--' + (type === 'bug' ? 'bug' : type === 'upgrade' ? 'upgrade' : 'feature');
        return [
            '<div class="ticket">',
            '<div class="ticket__bar ' + barClass + '"></div>',
            '<div class="ticket__content">',
            '<div class="ticket__title">' + escHtml(item.description || '') + '</div>',
            item.id ? '<span class="ticket__id"># ' + escHtml(String(item.id)) + '</span>' : '',
            item.details ? '<div class="ticket__desc">' + escHtml(item.details) + '</div>' : '',
            '</div>',
            '</div>'
        ].join('');
    }

    /* ── Build a grouped section (features / bugFixes / upgrades) ── */
    function buildGroup(items, label, cssClass, type) {
        if (!items || !items.length) return '';
        var html = '<div class="mb-3">';
        html += '<div class="group-label group-label--' + cssClass + '">' + label + '</div>';
        items.forEach(function(item) {
            html += buildTicket(item, type);
        });
        html += '</div>';
        return html;
    }

    /* ── Build one release block ──────────────────────────────────── */
    function buildRelease(release, filter) {
        var features = release.features || [];
        var bugFixes = release.bugFixes || [];
        var upgrades = release.upgrades || [];

        /* filter content based on active section */
        var groupsHtml = '';
        if (filter === 'releases' || filter === 'all') {
            groupsHtml += buildGroup(features, 'Features', 'feature', 'feature');
            groupsHtml += buildGroup(bugFixes, 'Bug Fixes', 'bug', 'bug');
            groupsHtml += buildGroup(upgrades, 'Upgrades', 'upgrade', 'upgrade');
        } else if (filter === 'bugfixes') {
            groupsHtml += buildGroup(bugFixes, 'Bug Fixes', 'bug', 'bug');
        } else if (filter === 'upgrades') {
            groupsHtml += buildGroup(upgrades, 'Upgrades', 'upgrade', 'upgrade');
        }

        if (!groupsHtml) return ''; /* skip releases with no items for this filter */

        return [
            '<div class="release-block">',
            '<div class="release-block__header">',
            '<span class="release-block__version">v' + escHtml(release.version || '') + '</span>',
            '<span class="release-block__date">' + escHtml(release.releaseDate || '') + '</span>',
            '</div>',
            '<div class="release-block__body">' + groupsHtml + '</div>',
            '</div>'
        ].join('');
    }

    /* ── Empty state placeholder ──────────────────────────────────── */
    function emptyState(msg) {
        return [
            '<div class="rn-empty">',
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
            '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v14a2 2 0 01-2 2z"/>',
            '</svg>',
            '<p>' + msg + '</p>',
            '</div>'
        ].join('');
    }

    /* ── HTML escape utility ──────────────────────────────────────── */
    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ── Populate all three sections from data ────────────────────── */
    function populateSections(data) {
        var releases = data.impact || [];

        /* All Releases */
        if (releases.length === 0) {
            $('#releases').html(
                '<h2 class="mainheading">All Releases</h2>' +
                '<p class="mainheading-sub">Full history of features, fixes &amp; upgrades across every version.</p>' +
                emptyState('No release notes available.')
            );
        } else {
            var allHtml = '<h2 class="mainheading">All Releases</h2>' +
                '<p class="mainheading-sub">Full history of features, fixes &amp; upgrades across every version.</p>';
            releases.forEach(function(r) {
                allHtml += buildRelease(r, 'releases');
            });
            $('#releases').html(allHtml);
        }

        /* Bug Fixes */
        var bugsHtml = '';
        releases.forEach(function(r) {
            bugsHtml += buildRelease(r, 'bugfixes');
        });
        $('#bugfixes-content').html(
            bugsHtml || emptyState('No bug fixes recorded for any release.')
        );

        /* Upgrades */
        var upgradesHtml = '';
        releases.forEach(function(r) {
            upgradesHtml += buildRelease(r, 'upgrades');
        });
        $('#upgrades-content').html(
            upgradesHtml || emptyState('No upgrades recorded for any release.')
        );

        /* Sidebar version badges */
        if (releases.length) {
            var badges = releases.map(function(r) {
                return '<span class="version-badge">v' + escHtml(r.version) + '</span>';
            }).join('');
            $('#sidebar-version-badges').html(badges);
            $('#sidebar-versions').show();
        }
    }

    /* ── Fetch and render JSON release notes ──────────────────────── */
    function loadReleaseNotes() {
        var _ROOT = (typeof DOMAIN_ROOT !== 'undefined' ? DOMAIN_ROOT : '') +
            (typeof IS_LOCAL_HOST !== 'undefined' && IS_LOCAL_HOST ? 'dist/' : '');
        var version = (typeof iVersion !== 'undefined' ? iVersion : 'v1');
        var url = _ROOT + 'assets/' + version + '/meta/release-note.json';

        fetch(url)
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(populateSections)
            .catch(function(err) {
                console.error('Release notes load failed:', err);
                var errHtml = '<div class="rn-error">⚠ Failed to load release notes. Please try again later.</div>';
                $('#releases').html(errHtml);
                $('#bugfixes-content, #upgrades-content').html(errHtml);
            });
    }

    /* ── Update nav icon states ───────────────────────────────────── */
    function updateIcons(activeContent) {
        /* reset all icons */
        Object.keys(ICON_MAP).forEach(function(content) {
            var id = ICON_MAP[content];
            $('#' + id + ', #' + id + '_m').attr('src', ICONS[id].default);
        });
        /* apply selected icon */
        var selId = ICON_MAP[activeContent];
        if (selId && ICONS[selId]) {
            $('#' + selId + ', #' + selId + '_m').attr('src', ICONS[selId].selected);
        }
    }

    /* ── Nav click handler (desktop + mobile) ─────────────────────── */
    $(document).on('click', '.nav-link', function(e) {
        e.preventDefault();
        var contentId = $(this).data('content');

        /* sync both navbars */
        $('.nav-link').removeClass('selected');
        $('[data-content="' + contentId + '"]').addClass('selected');

        /* switch sections */
        $('.rn-section').removeClass('active');
        $('#' + contentId).addClass('active');

        updateIcons(contentId);
    });

    /* ── Kick off ─────────────────────────────────────────────────── */
    loadReleaseNotes();

    /* set initial icon state */
    updateIcons('releases');
});