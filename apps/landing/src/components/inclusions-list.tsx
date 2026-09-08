import type { ResolvedPackageInclusion, ServicePackageWithInclusions } from '@sevendays/types';

/**
 * Inclusions per the detail spec: frames (each framed picture hangs off its
 * frame — ADR-0009), then prints (count × size), then privileges
 * (quantityless). Plain lists, no design pass.
 */
export function InclusionsList({ pkg }: { pkg: ServicePackageWithInclusions }) {
  const framed = pkg.inclusions.filter((i) => i.kind === 'framed_picture');
  const prints = pkg.inclusions.filter((i) => i.kind === 'print');
  const privileges = pkg.inclusions.filter((i) => i.kind === 'privilege');

  return (
    <div className='flex flex-col gap-2'>
      <h4 className='font-semibold'>Inclusions</h4>
      {pkg.frames.map((frame) => {
        const inFrame = framed.filter((i) => i.frameId === frame.id);
        if (inFrame.length === 0) return null;
        return (
          <div key={frame.id}>
            <p className='font-medium'>Frame {frame.frameNumber}</p>
            <ul className='list-disc pl-6'>
              {inFrame.map((i) => (
                <InclusionLine key={i.id} inclusion={i} />
              ))}
            </ul>
          </div>
        );
      })}
      <ul className='list-disc pl-6'>
        {prints.map((i) => (
          <InclusionLine key={i.id} inclusion={i} />
        ))}
        {privileges.map((i) => (
          <InclusionLine key={i.id} inclusion={i} />
        ))}
      </ul>
    </div>
  );
}

function InclusionLine({ inclusion }: { inclusion: ResolvedPackageInclusion }) {
  const size = inclusion.printSize ? inclusion.printSize.code : null;
  const attires =
    inclusion.attires.length > 0 ? inclusion.attires.map((a) => a.name).join(', ') : null;
  const parts = [
    inclusion.quantity !== null ? `×${inclusion.quantity}` : null,
    size,
    inclusion.description,
    attires,
  ].filter((part): part is string => part !== null);
  return <li>{parts.join(' · ')}</li>;
}
