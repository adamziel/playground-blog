(async function () {
	function endLoading() {
		document.body.classList.remove('playground-markdown-loading');
	}

	if (
		!window.playgroundMarkdown.markdown ||
		!window.playgroundMarkdown.markdown.length
	) {
		document.addEventListener('DOMContentLoaded', endLoading);
		return;
	}

	await import('../blocky-formats/vendor/commonmark.min.js');
	const { markdownToBlocks } = await import(
		'../blocky-formats/src/markdown.js'
	);
    
    await fetch('/wp-json/wp/v2/page-hierarchy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': wpApiSettings.nonce,
        },
        body: JSON.stringify({
            pages: window.playgroundMarkdown.markdown.map((file) => ({
                ...file,
                content: (
                    file.content
                        ? markdownToBlocks(file.content).map((block) =>
                            wp.blocks.serializeRawBlock({
                                blockName: block.name,
                                attrs: block.attributes,
                                innerBlocks: block.innerBlocks,
                                innerContent: [block.attributes.content],
                            })
                        )
                        : []
                ).join("\n"),
            }))
        }),
    })

    if(window.location.pathname !== '/wp-admin/edit.php') {
        window.location = '/wp-admin/edit.php?post_type=page';
	} else {
		endLoading();
	}
})();
