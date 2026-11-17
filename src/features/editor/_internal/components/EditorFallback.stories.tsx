import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { EditorFallback } from "@/features/editor/_internal/components/EditorFallback";

const CODE = `export function useDebounce<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}`;

// What the editors show when Monaco could not load: a state the app reaches
// only on a failed chunk.
const meta = {
  component: EditorFallback,
  decorators: [
    (Story) => (
      <div className="max-w-2xl rounded-lg border">
        <Story />
      </div>
    ),
  ],
  args: { value: CODE, readOnly: false, ariaLabel: "Content", onChange: fn() },
} satisfies Meta<typeof EditorFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

// In a form the text stays editable, so a failed load costs the highlighting
// and not the user's work.
export const Editable: Story = {
  play: async ({ args, canvasElement }) => {
    const textarea = within(canvasElement).getByRole("textbox", {
      name: "Content",
    });
    await userEvent.type(textarea, "!");
    await expect(args.onChange).toHaveBeenCalledWith(`${CODE}!`);
  },
};

export const ReadOnly: Story = { args: { readOnly: true } };
