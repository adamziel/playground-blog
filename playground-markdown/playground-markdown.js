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
	} else {
		document.addEventListener('DOMContentLoaded', () => {
			document.body.classList.add('playground-markdown-loading');
		});
	}

	window.addEventListener('beforeunload', (event) => {
		event.stopImmediatePropagation();
	});

	await import('../blocky-formats/vendor/commonmark.min.js');
	const { markdownToBlocks } = await import(
		'../blocky-formats/src/markdown.js'
	);

	const createBlocks = (blocks) =>
		blocks.map((block) =>
			wp.blocks.createBlock(
				block.name,
				block.attributes,
				block.innerBlocks ? createBlocks(block.innerBlocks) : []
			)
		);

	const pagesWithBlockMarkup = [];
	for (const file of window.playgroundMarkdown.markdown) {
		const blocks = createBlocks(markdownToBlocks(file.content));
		pagesWithBlockMarkup.push({
			...file,
			content: wp.blocks.serialize(blocks),
		});
	}

	const response = await fetch('/wp-json/wp/v2/page-hierarchy', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce': wpApiSettings.nonce,
		},
		body: JSON.stringify({
			pages: pagesWithBlockMarkup,
		}),
    });
    try {
        console.log(await response.text());
    } catch { }

	if (window.location.pathname !== '/wp-admin/edit.php') {
		window.location = '/wp-admin/edit.php?post_type=page';
	} else {
		endLoading();
	}
})();
