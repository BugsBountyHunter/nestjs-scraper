import { anonymizeFixtureHtml, findLeaks } from './anonymize-fixture';

const SAMPLE = `
<li><a href="https://www.linkedin.com/in/linusupson?trk=org-employees" data-tracking-control-name="org-employees">
  <img data-delayed-url="https://media.licdn.com/dms/image/v2/C4E03AQG2Lq9P/profile-displayphoto-shrink_100_100/0/1516?e=2147483647&amp;v=beta&amp;t=ClDJWsCSg7Apu" alt="Click here to view Linus Upson’s profile">
  <h3 class="base-main-card__title">
    Linus Upson
  </h3></a></li>
<a href="https://www.linkedin.com/in/mindy-kay-brooks?trk=feed">Mindy Brooks</a>
<p>Great talk by Mindy Kay Brooks and Linus Upson today.</p>
<a href="https://www.linkedin.com/in/dar%C3%ADo-gil-58575713?trk=feed">Darío Gil</a>
<img alt="View profile for Darío Gil" src="x">
<p>Darío&#39;s team shipped it.</p>
<img src="https://media.licdn.com/dms/image/v2/D4E0BAQ/company-logo_100_100/0/1?e=1&amp;v=beta&amp;t=abc" alt="Google">
<a href="/jobs/view/123?refId=AbC%2Fxyz%3D%3D&amp;trackingId=Zz9%2Bqq%3D%3D&amp;trk=public_jobs">Job</a>
<script>window.x = {"trackingId":"Q1dE+abc==","pageInstance":"urn:li:page:d_flagship3;Xy9+abc=="};</script>
<a href="https://www.linkedin.com/signup?session_id=f5755e5a-e8de-4b36-86ef-a7bdbac42ef6&amp;instanceId=fb6b1234-5678">x</a>
`;

describe('anonymizeFixtureHtml', () => {
  const { html, report } = anonymizeFixtureHtml(SAMPLE);

  it('replaces every member slug with a stable placeholder', () => {
    expect(html).not.toMatch(/linusupson|mindy-kay-brooks|dar%C3%ADo-gil/);
    expect(html).toContain('/in/member-1?trk=org-employees');
    expect(html).toContain('/in/member-2?trk=feed');
    expect(report.members).toBe(3);
  });

  it('replaces display names, slug-derived full names, alt text and first-name mentions', () => {
    expect(html).not.toMatch(/Linus|Upson|Mindy|Brooks|Darío|Dar&iacute;o/);
    expect(html).toContain('alt="Click here to view Member 1’s profile"');
    expect(html).toContain('Great talk by Member 2 and Member 1 today.');
    expect(html).toContain('alt="View profile for Member 3"');
  });

  it('replaces member photos but keeps organization logos', () => {
    expect(html).not.toContain('profile-displayphoto');
    expect(html).toContain('company-logo_100_100');
  });

  it('scrubs capture-session tracking identifiers', () => {
    expect(html).not.toMatch(/f5755e5a|fb6b1234|AbC%2Fxyz|Zz9%2Bqq|Q1dE\+abc|Xy9\+abc/);
    expect(html).toContain('session_id=00000000-0000-0000-0000-000000000000');
    expect(html).toContain('trk=public_jobs'); // static campaign tags are not identifiers
  });

  it('is idempotent', () => {
    expect(anonymizeFixtureHtml(html).html).toBe(html);
  });
});

describe('findLeaks', () => {
  it('reports surname tokens that survived anonymization', () => {
    expect(findLeaks('<p>by Manyika</p>', ['manyika', 'kurian'])).toEqual(['manyika']);
  });
});
