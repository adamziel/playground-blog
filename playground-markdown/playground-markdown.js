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

	const parents = {};

	for (let file of window.playgroundMarkdown.markdown) {
		const content = file.content
			? markdownToBlocks(file.content).map((block) =>
					wp.blocks.serializeRawBlock({
						blockName: block.name,
						attrs: block.attributes,
						innerBlocks: block.innerBlocks,
						innerContent: [block.attributes.content],
					})
			  )
			: [];
		const postData = {
			title: file.name,
			content: content.join(''),
			status: 'publish',
        };
		const parentPath = file.path.split('/').slice(0, -1).join('/');
        if (parentPath in parents) {
            parents[parentPath].parent = parents[parentPath].id;
        }
		const page = await fetch('/wp-json/wp/v2/pages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-WP-Nonce': wpApiSettings.nonce,
			},
			body: JSON.stringify(postData),
		});
		parents[file.path] = (await page.json()).id;
	}

	if (window.location.pathname !== '/category/uncategorized/') {
		window.open('/category/uncategorized/', '_self');
	} else {
		endLoading();
	}
})();
