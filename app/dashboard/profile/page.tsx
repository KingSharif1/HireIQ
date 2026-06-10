'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Zap,
  CheckCircle,
  Loader2,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Link2,
  Code2,
  Globe,
  FileText,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Sparkles,
} from 'lucide-react'
import type {
  Profile,
  StructuredResume,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
} from '@/types'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resume, setResume] = useState<StructuredResume | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, resumeRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('resumes')
          .select('structured_data')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (profileRes.data) {
        const data = profileRes.data
        setProfile(data)
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setUsername(data.username ?? '')
        setTargetRole(data.target_role ?? '')
        setYearsExperience(data.years_experience?.toString() ?? '')
      }
      if (resumeRes.data?.structured_data) {
        setResume(resumeRes.data.structured_data as StructuredResume)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim() || null,
        target_role: targetRole.trim() || null,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setProfile(p =>
        p
          ? {
              ...p,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              username: username.trim() || null,
              target_role: targetRole.trim() || null,
              years_experience: yearsExperience ? parseInt(yearsExperience) : null,
            }
          : p
      )
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const fullName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : resume?.contact?.name || 'Your Profile'
  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() ||
    resume?.contact?.name?.[0]?.toUpperCase() ||
    '?'

  const contact = resume?.contact
  const allSkills = [
    ...(resume?.skills?.technical || []),
    ...(resume?.skills?.tools || []),
    ...(resume?.skills?.languages || []),
  ]

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading profile…
      </div>
    )
  }

  // ---- Edit mode ---------------------------------------------------------
  if (editing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Info</CardTitle>
              <CardDescription>Your name is shown on your tailored resumes and cover letters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">First name <span className="text-destructive">*</span></label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Last name <span className="text-destructive">*</span></label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Username <span className="text-muted-foreground text-xs font-normal">(optional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_]/g, '').toLowerCase())}
                    placeholder="johnsmith"
                    className="pl-7"
                    maxLength={32}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={profile?.email ?? ''} disabled className="opacity-50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Email can&apos;t be changed here.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Career Info</CardTitle>
              <CardDescription>Helps the AI tailor your resume more accurately.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Target role</label>
                <Input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="e.g. Software Engineer, Product Manager" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Years of experience</label>
                <Input type="number" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} placeholder="e.g. 3" min={0} max={50} />
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving} className="min-w-[120px]">
              {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : 'Save changes'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // ---- Resume-style view -------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {saved && (
        <div className="flex items-center gap-1.5 text-sm text-brand-green">
          <CheckCircle className="w-4 h-4" />
          Profile saved
        </div>
      )}

      <Card className="overflow-hidden">
        {/* Header block */}
        <div className="relative bg-gradient-to-br from-brand-purple/20 via-card to-card border-b border-border p-6 sm:p-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditing(true)}
            className="absolute top-4 right-4"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-brand-purple/25 border-2 border-brand-purple/40 flex items-center justify-center text-2xl font-bold text-brand-purple flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{fullName}</h1>
              {targetRole && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Zap className="w-4 h-4 text-brand-purple" />
                  <span className="text-sm text-brand-purple font-medium">{targetRole}</span>
                  {yearsExperience && (
                    <span className="text-sm text-muted-foreground">· {yearsExperience} yrs experience</span>
                  )}
                </div>
              )}

              {/* Contact row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                {profile?.email && (
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{profile.email}</span>
                )}
                {contact?.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{contact.phone}</span>
                )}
                {contact?.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{contact.location}</span>
                )}
                {contact?.linkedin && (
                  <span className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />{contact.linkedin}</span>
                )}
                {contact?.github && (
                  <span className="flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" />{contact.github}</span>
                )}
                {(contact?.portfolio || contact?.website) && (
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />{contact.portfolio || contact.website}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-7">
          {!resume ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">No resume yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a resume to fill out your profile automatically.
              </p>
              <Button asChild>
                <Link href="/dashboard/resume/upload">
                  <Sparkles className="w-4 h-4" />
                  Upload Resume
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Summary */}
              {resume.summary && (
                <section>
                  <SectionLabel icon={<FileText className="w-3.5 h-3.5" />}>Summary</SectionLabel>
                  <p className="text-sm text-foreground leading-relaxed">{resume.summary}</p>
                </section>
              )}

              {/* Experience */}
              {resume.experience?.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <SectionLabel icon={<Briefcase className="w-3.5 h-3.5" />}>Experience</SectionLabel>
                    <div className="space-y-5">
                      {resume.experience.map((exp: ResumeExperience) => (
                        <div key={exp.id}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm text-white">{exp.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground flex-shrink-0">
                              {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                            </p>
                          </div>
                          <ul className="mt-2 space-y-1">
                            {exp.bullets?.map((bullet: string, i: number) => (
                              <li key={i} className="text-sm text-foreground flex gap-2">
                                <span className="text-brand-purple mt-0.5">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Skills */}
              {allSkills.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <SectionLabel icon={<Zap className="w-3.5 h-3.5" />}>Skills</SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {allSkills.slice(0, 40).map(skill => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Education */}
              {resume.education?.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <SectionLabel icon={<GraduationCap className="w-3.5 h-3.5" />}>Education</SectionLabel>
                    <div className="space-y-3">
                      {resume.education.map((edu: ResumeEducation) => (
                        <div key={edu.id} className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-white">
                              {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">{edu.institution}</p>
                            {edu.gpa && <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>}
                          </div>
                          <p className="text-xs text-muted-foreground flex-shrink-0">
                            {edu.startDate} – {edu.endDate}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* Projects */}
              {resume.projects?.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <SectionLabel icon={<FolderGit2 className="w-3.5 h-3.5" />}>Projects</SectionLabel>
                    <div className="space-y-4">
                      {resume.projects.map((proj: ResumeProject) => (
                        <div key={proj.id}>
                          <p className="font-semibold text-sm text-white">{proj.name}</p>
                          {proj.technologies?.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">{proj.technologies.join(', ')}</p>
                          )}
                          <ul className="mt-1.5 space-y-1">
                            {proj.bullets?.map((bullet: string, i: number) => (
                              <li key={i} className="text-sm text-foreground flex gap-2">
                                <span className="text-brand-purple mt-0.5">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      <span className="text-brand-purple">{icon}</span>
      {children}
    </p>
  )
}
