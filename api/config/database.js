const {createClient} = require('@supabase/supabase-js')

const supabase = createClient(
    "https://dpjzdzhdhqgackpxojdi.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanpkemhkaHFnYWNrcHhvamRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ4NDczOCwiZXhwIjoyMDY3MDYwNzM4fQ.eAN0skXy5phQyvD4RO3HFaUfXP1-D0So61qVck8jSU0")


module.exports =  {
    supabase
}
