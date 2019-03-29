const robots = {
	text: require('./robots/text'),
	input: require('./robots/input'),
	state: require('./robots/state')
};

async function start()
{
	robots.input();
	await robots.text();

	const content = robots.state.load();

	console.dir(content, {depth: null});
}

start();