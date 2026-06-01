export default function DynamicSection(props) {
	return (
		<>
			<div
				className={`${props.className ? props.className : ""}`}
				dangerouslySetInnerHTML={{
					__html: props.content,
				}}
			></div>
		</>
	);
}
