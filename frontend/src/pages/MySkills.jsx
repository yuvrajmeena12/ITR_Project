import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useAsync';
import SkillManager from '../components/SkillManager';
import { Icon, PageHeader } from '../components/ui';

export default function MySkills() {
  useDocumentTitle('Manage Skills');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'learn' ? 'learn' : 'teach';

  return (
    <div className="page page-narrow">
      <PageHeader
        title="My Skill Inventory"
        subtitle="Organize what you are ready to teach others and what you are eager to learn next."
      />

      <div className="tabs" role="tablist" aria-label="Skill manager inventory">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'teach'}
          onClick={() => setParams({})}
        >
          <Icon name="book" size={17} /> I Can Teach
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'learn'}
          onClick={() => setParams({ tab: 'learn' })}
        >
          <Icon name="spark" size={17} /> I Want to Learn
        </button>
      </div>

      <SkillManager type={tab} key={tab} />
    </div>
  );
}
