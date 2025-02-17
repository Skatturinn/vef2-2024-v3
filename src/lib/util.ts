import slugify from "slugify";

export function sluggy(name: string) {
	return slugify(name, {
		replacement: '-',  // replace spaces with replacement character, defaults to `-`
		remove: undefined, // remove characters that match regex, defaults to `undefined`
		lower: true,      // convert to lower case, defaults to `false`
		strict: false,     // strip special characters except replacement, defaults to `false`
		locale: 'vi',      // language code of the locale to use
		trim: true         // trim leading and trailing replacement chars, defaults to `true`
	})
}

export function mappedTeam(team: { name: string, id: number, slug: string, description: string | null }) {
	return {
		id: team.id,
		name: team.name,
		slug: team.slug,
		description: team.description,
		href: `/teams/${team.slug}`
	}
}

export function currentdate() {
	return String(
		(new Date().toISOString()).slice(0, 10).split('-').reverse()
	)
}