import { DOCKER_IMAGE, DEV_URL } from './constants';

export function getAgentImageTag(): 'dev' | 'prod' {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.includes(DEV_URL) ? 'dev' : 'prod';
}

export function buildDockerRunCommand(token: string): string {
  const tag = getAgentImageTag();
  const name = tag === 'dev' ? 'backnet-agent-dev' : 'backnet-agent';
  return `docker rm -f ${name} 2>/dev/null; docker run -d --name ${name} --restart unless-stopped ${DOCKER_IMAGE}:${tag} --token ${token}`;
}
