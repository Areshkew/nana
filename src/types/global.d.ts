declare module '*.css' {
  const content: string
  export default content
}

declare namespace JSX {
  type Element = React.JSX.Element
}
