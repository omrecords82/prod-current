import EditableText from '../EditableText';

interface BulletListProps {
  items: string[];
  contentKeys?: string[];
}

/**
 * Gold-bullet list used in Tour steps, feature descriptions, and similar sections.
 * When contentKeys are provided, each item becomes inline-editable via EditableText.
 */
const BulletList = ({ items, contentKeys }: BulletListProps) => (
  <ul className="space-y-4">
    {items.map((item, i) => (
      <li key={contentKeys?.[i] ?? item} className="flex items-start gap-3">
        <div className="om-bullet mt-2.5" />
        {contentKeys?.[i] ? (
          <EditableText contentKey={contentKeys[i]} as="span" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
            {item}
          </EditableText>
        ) : (
          <span className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">{item}</span>
        )}
      </li>
    ))}
  </ul>
);

export default BulletList;
